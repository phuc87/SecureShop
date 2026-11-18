package com.secureshop.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.secureshop.dto.call.CallEvent;
import com.secureshop.dto.chat.ChatEvent;
import com.secureshop.dto.chat.ConversationResponse;
import com.secureshop.dto.chat.MessageResponse;
import com.secureshop.entity.CallLog;
import com.secureshop.entity.Conversation;
import com.secureshop.entity.Message;
import com.secureshop.entity.User;
import com.secureshop.entity.enums.*;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.CallLogRepository;
import com.secureshop.repository.ConversationRepository;
import com.secureshop.repository.MessageRepository;
import com.secureshop.repository.UserRepository;
import com.secureshop.security.UserPrincipal;
import com.secureshop.websocket.ChatNotifier;
import com.secureshop.websocket.PresenceTracker;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * Gọi video giữa khách hàng và tư vấn viên.
 *
 * Server chỉ làm "tổng đài": đổ chuông, nhận/từ chối, chuyển tiếp dữ liệu WebRTC (offer/answer/ICE) giữa 2 trình duyệt.
 * Hình và tiếng đi THẲNG giữa 2 máy (peer-to-peer), không qua server.
 *
 *   Khách gọi     -> đổ chuông các tư vấn viên đang online (ưu tiên người đang phụ trách hội thoại)
 *   Tư vấn viên gọi -> đổ chuông khách (khách phải đang online)
 *   30 giây không ai bắt máy -> cuộc gọi nhỡ
 *
 * Mỗi cuộc gọi được lưu vào call_logs, và kết thúc thì thêm 1 tin CALL_LOG vào khung chat
 * ("Cuộc gọi video · 3 phút 12 giây", "Cuộc gọi video nhỡ"...).
 * Trạng thái cuộc gọi đang diễn ra giữ trong bộ nhớ (ít, ngắn) và mọi thay đổi đi qua 1 khoá để không bị tranh chấp.
 */
@Slf4j
@Service
public class CallService {

    public static final int RING_SECONDS = 30;
    private static final Set<String> SIGNAL_KINDS = Set.of("offer", "answer", "ice", "media");
    private static final String QUEUE = "/queue/call";

    private final CallLogRepository callRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ChatNotifier notifier;
    private final PresenceTracker presence;
    private final TransactionTemplate tx;

    private final Map<Long, ActiveCall> active = new ConcurrentHashMap<>();
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "call-ring-timeout");
        t.setDaemon(true);
        return t;
    });

    public CallService(CallLogRepository callRepository, ConversationRepository conversationRepository,
                       MessageRepository messageRepository, UserRepository userRepository, ChatNotifier notifier,
                       PresenceTracker presence, PlatformTransactionManager txManager) {
        this.callRepository = callRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.notifier = notifier;
        this.presence = presence;
        this.tx = new TransactionTemplate(txManager);
    }

    /** 1 cuộc gọi đang đổ chuông hoặc đang nói. */
    private static final class ActiveCall {
        final long id;
        final long conversationId;
        final Party caller;
        final CallType type;
        /** Những người đang được đổ chuông: id -> email. */
        final Map<Long, Party> ringing = new LinkedHashMap<>();
        Party callee;
        CallStatus status = CallStatus.RINGING;
        LocalDateTime answeredAt;
        ScheduledFuture<?> timeout;

        ActiveCall(long id, long conversationId, Party caller, CallType type) {
            this.id = id;
            this.conversationId = conversationId;
            this.caller = caller;
            this.type = type;
        }

        boolean involves(long userId) {
            return caller.id == userId || (callee != null && callee.id == userId) || ringing.containsKey(userId);
        }

        Party peerOf(long userId) {
            return caller.id == userId ? callee : caller;
        }
    }

    private record Party(long id, String email, String name, Role role) {
        static Party of(User u) {
            return new Party(u.getId(), u.getEmail(), u.getFullName(), u.getRole());
        }

        static Party of(UserPrincipal p) {
            return new Party(p.id(), p.email(), p.fullName(), p.role());
        }
    }

    // ================================ BẮT ĐẦU / NHẬN / TỪ CHỐI / GÁC MÁY ================================

    /** Gọi trong 1 hội thoại. Trả về CALL_OUTGOING (callId) để giao diện hiện màn hình "Đang gọi...". */
    public synchronized CallEvent start(UserPrincipal me, Long conversationId, CallType type) {
        Conversation conv = conversationRepository.findWithUsersById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hội thoại"));
        boolean isAdmin = me.role() == Role.ADMIN;
        if (!isAdmin && !conv.getCustomer().getId().equals(me.id())) {
            throw ApiException.forbidden("Bạn không có quyền gọi trong hội thoại này");
        }
        if (isBusy(me.id())) throw ApiException.conflict("Bạn đang trong một cuộc gọi khác");
        if (active.values().stream().anyMatch(c -> c.conversationId == conversationId)) {
            throw ApiException.conflict("Hội thoại này đang có cuộc gọi");
        }

        Map<Long, Party> targets = new LinkedHashMap<>();
        if (isAdmin) {
            User customer = conv.getCustomer();
            if (!presence.isOnline(customer.getId())) {
                throw ApiException.conflict("Khách hàng đang offline nên chưa gọi được. Hãy nhắn tin hẹn giờ gọi.");
            }
            if (isBusy(customer.getId())) throw ApiException.conflict("Khách hàng đang trong cuộc gọi khác");
            targets.put(customer.getId(), Party.of(customer));
        } else {
            Map<Long, String> admins = presence.onlineAdmins();
            admins.keySet().removeIf(this::isBusy);
            User assigned = conv.getAdmin();
            if (assigned != null && admins.containsKey(assigned.getId())) {
                targets.put(assigned.getId(), Party.of(assigned)); // ưu tiên người đang phụ trách
            } else {
                userRepository.findAllById(admins.keySet()).forEach(u -> targets.put(u.getId(), Party.of(u)));
            }
            if (targets.isEmpty()) {
                throw ApiException.conflict("Hiện chưa có tư vấn viên rảnh để nghe máy. "
                        + "Bạn hãy nhắn tin, tư vấn viên sẽ gọi lại ngay khi có thể.");
            }
        }

        Long callId = tx.execute(s -> {
            CallLog log = new CallLog();
            log.setConversation(conversationRepository.getReferenceById(conversationId));
            log.setCaller(userRepository.getReferenceById(me.id()));
            if (isAdmin) log.setCallee(userRepository.getReferenceById(targets.keySet().iterator().next()));
            log.setCallType(type);
            log.setStatus(CallStatus.RINGING);
            log.setStartedAt(LocalDateTime.now());
            return callRepository.save(log).getId();
        });

        Party caller = Party.of(me);
        ActiveCall call = new ActiveCall(callId, conversationId, caller, type);
        call.ringing.putAll(targets);
        active.put(callId, call);
        call.timeout = timer.schedule(() -> onRingTimeout(callId), RING_SECONDS, TimeUnit.SECONDS);

        CallEvent ring = CallEvent.withPeer("CALL_RING", callId, conversationId, caller.id(), caller.name(),
                caller.role().name(), type.name());
        targets.values().forEach(t -> notifier.toUser(t.email(), QUEUE, ring));
        log.info("Cuộc gọi #{}: {} #{} gọi {} người (hội thoại #{})", callId, me.role(), me.id(), targets.size(), conversationId);

        String peerName = isAdmin ? conv.getCustomer().getFullName() : "Tư vấn viên SecureShop";
        Long peerId = isAdmin ? conv.getCustomer().getId() : null;
        return CallEvent.withPeer("CALL_OUTGOING", callId, conversationId, peerId, peerName,
                isAdmin ? Role.CUSTOMER.name() : Role.ADMIN.name(), type.name());
    }

    /** Bắt máy. Trả về thông tin người gọi để giao diện hiện tên. */
    public synchronized CallEvent accept(UserPrincipal me, Long callId) {
        ActiveCall call = active.get(callId);
        if (call == null || call.status != CallStatus.RINGING) {
            throw ApiException.conflict("Cuộc gọi đã kết thúc hoặc đã có người nhận");
        }
        Party me2 = call.ringing.get(me.id());
        if (me2 == null) throw ApiException.forbidden("Cuộc gọi này không dành cho bạn");
        if (isBusyExcept(me.id(), callId)) throw ApiException.conflict("Bạn đang trong một cuộc gọi khác");

        call.status = CallStatus.ACCEPTED;
        call.callee = me2;
        call.answeredAt = LocalDateTime.now();
        if (call.timeout != null) call.timeout.cancel(false);

        tx.executeWithoutResult(s -> {
            CallLog log = callRepository.findById(callId).orElseThrow();
            log.setStatus(CallStatus.ACCEPTED);
            log.setCallee(userRepository.getReferenceById(me.id()));
            log.setAnsweredAt(call.answeredAt);
            if (me.role() == Role.ADMIN) {
                // Tư vấn viên bắt máy -> phụ trách luôn hội thoại này
                Conversation conv = conversationRepository.findById(call.conversationId).orElseThrow();
                conv.setAdmin(userRepository.getReferenceById(me.id()));
                if (conv.getStatus() != ConversationStatus.ACTIVE) conv.setStatus(ConversationStatus.ACTIVE);
            }
        });

        // Tắt chuông ở mọi nơi khác (tab khác, tư vấn viên khác), rồi báo người gọi tạo kết nối WebRTC
        CallEvent taken = CallEvent.of("CALL_TAKEN", callId, call.conversationId);
        call.ringing.values().forEach(t -> notifier.toUser(t.email(), QUEUE, taken));
        call.ringing.clear();
        notifier.toUser(call.caller.email(), QUEUE, CallEvent.withPeer("CALL_ACCEPTED", callId, call.conversationId,
                me2.id(), me2.name(), me2.role().name(), call.type.name()));
        log.info("Cuộc gọi #{}: #{} đã bắt máy", callId, me.id());

        return CallEvent.withPeer("CALL_ACCEPTED", callId, call.conversationId, call.caller.id(), call.caller.name(),
                call.caller.role().name(), call.type.name());
    }

    /** Từ chối. Khách gọi mà nhiều tư vấn viên cùng đổ chuông: 1 người từ chối thì vẫn đổ chuông người khác. */
    public synchronized void reject(UserPrincipal me, Long callId) {
        ActiveCall call = active.get(callId);
        if (call == null || call.status != CallStatus.RINGING) return;
        Party who = call.ringing.remove(me.id());
        if (who == null) throw ApiException.forbidden("Cuộc gọi này không dành cho bạn");
        notifier.toUser(who.email(), QUEUE, CallEvent.of("CALL_TAKEN", callId, call.conversationId)); // tắt chuông ở tab khác
        if (call.ringing.isEmpty()) {
            finish(call, CallStatus.REJECTED, who.role() == Role.ADMIN ? "Tư vấn viên đang bận, chưa nghe máy được"
                    : "Khách hàng đã từ chối cuộc gọi");
        }
    }

    /** Gác máy: đang đổ chuông thì là huỷ cuộc gọi, đang nói thì kết thúc. Gọi lại nhiều lần cũng không sao. */
    public synchronized void hangUp(UserPrincipal me, Long callId) {
        ActiveCall call = active.get(callId);
        if (call == null) return;
        if (call.status == CallStatus.RINGING) {
            if (call.caller.id() != me.id()) {
                reject(me, callId);
                return;
            }
            finish(call, CallStatus.MISSED, "Người gọi đã huỷ");
        } else if (call.involves(me.id())) {
            finish(call, CallStatus.ENDED, me.role() == Role.ADMIN ? "Tư vấn viên đã kết thúc cuộc gọi"
                    : "Khách hàng đã kết thúc cuộc gọi");
        }
    }

    /** Chuyển tiếp dữ liệu WebRTC sang người bên kia. Chỉ 2 người trong cuộc gọi đã kết nối mới gửi được. */
    public void relay(UserPrincipal me, Long callId, String kind, JsonNode data) {
        if (kind == null || !SIGNAL_KINDS.contains(kind)) return;
        ActiveCall call = active.get(callId);
        if (call == null || call.status != CallStatus.ACCEPTED) return;
        if (call.caller.id() != me.id() && (call.callee == null || call.callee.id() != me.id())) return;
        Party peer = call.peerOf(me.id());
        if (peer != null) notifier.toUser(peer.email(), QUEUE, CallEvent.signal(callId, kind, data));
    }

    // ================================ TỰ ĐỘNG ================================

    private synchronized void onRingTimeout(Long callId) {
        ActiveCall call = active.get(callId);
        if (call != null && call.status == CallStatus.RINGING) {
            finish(call, CallStatus.MISSED, "Không ai bắt máy");
        }
    }

    /** Đóng hết tab / mất mạng: kết thúc các cuộc gọi của người đó. */
    @EventListener
    public synchronized void onUserOffline(PresenceTracker.UserWentOffline e) {
        long uid = e.userId();
        for (ActiveCall call : new ArrayList<>(active.values())) {
            if (!call.involves(uid)) continue;
            if (call.status == CallStatus.RINGING && call.caller.id() != uid) {
                call.ringing.remove(uid);
                if (call.ringing.isEmpty()) finish(call, CallStatus.MISSED, "Không ai bắt máy");
            } else if (call.status == CallStatus.RINGING) {
                finish(call, CallStatus.MISSED, "Người gọi đã mất kết nối");
            } else {
                finish(call, CallStatus.ENDED, "Bên kia đã mất kết nối");
            }
        }
    }

    /** Lần chạy trước tắt đột ngột giữa cuộc gọi -> các dòng còn dở chuyển thành FAILED. */
    @EventListener(ApplicationReadyEvent.class)
    public void cleanUpOnStartup() {
        Integer n = tx.execute(s -> callRepository.failUnfinished(LocalDateTime.now()));
        if (n != null && n > 0) log.info("Đã đóng {} cuộc gọi còn dở từ lần chạy trước", n);
    }

    @PreDestroy
    void shutdown() {
        timer.shutdownNow();
    }

    // ================================ NỘI BỘ ================================

    /** Kết thúc cuộc gọi: lưu DB, thêm tin CALL_LOG vào khung chat, báo cho mọi người liên quan. */
    private void finish(ActiveCall call, CallStatus status, String reason) {
        if (active.remove(call.id) == null) return;
        if (call.timeout != null) call.timeout.cancel(false);
        LocalDateTime now = LocalDateTime.now();
        int duration = call.answeredAt == null ? 0 : (int) Duration.between(call.answeredAt, now).getSeconds();

        tx.executeWithoutResult(s -> {
            CallLog log = callRepository.findById(call.id).orElseThrow();
            log.setStatus(status);
            log.setEndedAt(now);
            log.setDurationSeconds(duration);

            Conversation conv = conversationRepository.findWithUsersById(call.conversationId).orElseThrow();
            Message m = new Message();
            m.setConversation(conv);
            m.setSender(userRepository.getReferenceById(call.caller.id()));
            m.setSenderType(call.caller.role() == Role.ADMIN ? SenderType.ADMIN : SenderType.CUSTOMER);
            m.setType(MessageType.CALL_LOG);
            m.setContent(callLogText(call, status, reason, duration));
            messageRepository.save(m);
            conv.setLastMessageAt(now);
            if (status != CallStatus.ENDED) {
                // Cuộc gọi nhỡ/bị từ chối: báo chưa đọc cho phía được gọi
                if (call.caller.role() == Role.ADMIN) conv.setUnreadCustomer(conv.getUnreadCustomer() + 1);
                else conv.setUnreadAdmin(conv.getUnreadAdmin() + 1);
            }
            conversationRepository.flush();
            ChatEvent chat = ChatEvent.message(MessageResponse.from(m), ConversationResponse.from(conv, m));
            notifier.toAdmins(chat);
            notifier.toCustomer(conv.getCustomer().getEmail(), chat);
        });

        String type = switch (status) {
            case REJECTED -> "CALL_REJECTED";
            case MISSED -> "CALL_MISSED";
            default -> "CALL_ENDED";
        };
        CallEvent ev = CallEvent.ended(type, call.id, call.conversationId, reason, duration);
        Set<String> to = new LinkedHashSet<>();
        to.add(call.caller.email());
        if (call.callee != null) to.add(call.callee.email());
        call.ringing.values().forEach(p -> to.add(p.email()));
        to.forEach(email -> notifier.toUser(email, QUEUE, ev));
        log.info("Cuộc gọi #{} kết thúc: {} ({}), {} giây", call.id, status, reason, duration);
    }

    private static String callLogText(ActiveCall call, CallStatus status, String reason, int duration) {
        String kind = call.type == CallType.AUDIO ? "Cuộc gọi thoại" : "Cuộc gọi video";
        return switch (status) {
            case ENDED -> kind + " · " + formatDuration(duration);
            case REJECTED -> call.caller.role() == Role.CUSTOMER ? kind + ": tư vấn viên đang bận" : kind + " bị từ chối";
            case MISSED -> "Người gọi đã huỷ".equals(reason) ? kind + " đã huỷ" : kind + " nhỡ";
            default -> kind + " bị gián đoạn";
        };
    }

    static String formatDuration(int seconds) {
        if (seconds < 60) return seconds + " giây";
        int m = seconds / 60, s = seconds % 60;
        return s == 0 ? m + " phút" : m + " phút " + s + " giây";
    }

    private boolean isBusy(long userId) {
        return active.values().stream().anyMatch(c -> c.caller.id() == userId
                || (c.callee != null && c.callee.id() == userId));
    }

    private boolean isBusyExcept(long userId, long callId) {
        return active.values().stream().anyMatch(c -> c.id != callId
                && (c.caller.id() == userId || (c.callee != null && c.callee.id() == userId)));
    }
}
