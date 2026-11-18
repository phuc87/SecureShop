package com.secureshop.service;

import com.secureshop.dto.chat.*;
import com.secureshop.entity.Conversation;
import com.secureshop.entity.Message;
import com.secureshop.entity.User;
import com.secureshop.entity.enums.*;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.ConversationRepository;
import com.secureshop.repository.MessageRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.UserRepository;
import com.secureshop.security.UserPrincipal;
import com.secureshop.websocket.ChatNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ chat khách hàng <-> tư vấn viên. Mọi tin nhắn đều lưu vào bảng messages trước,
 * sau đó mới đẩy qua WebSocket (ChatNotifier gửi sau khi commit).
 *
 * Quyền:
 *  - Khách chỉ đọc/gửi trong hội thoại của chính mình.
 *  - Admin đọc/gửi trong mọi hội thoại.
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int PAGE_SIZE = 30;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ChatNotifier notifier;

    // ===================== KHÁCH HÀNG =====================

    /** Lấy hội thoại của khách; chưa có thì tạo mới. */
    @Transactional
    public ConversationResponse getOrCreateForCustomer(UserPrincipal me) {
        if (me.role() != Role.CUSTOMER) throw ApiException.forbidden("Chỉ khách hàng mới mở hội thoại tư vấn");
        Conversation c = conversationRepository.findFirstByCustomerIdOrderByIdDesc(me.id()).orElseGet(() -> {
            Conversation n = new Conversation();
            n.setCustomer(userRepository.getReferenceById(me.id()));
            n.setStatus(ConversationStatus.WAITING);
            return conversationRepository.save(n);
        });
        return toResponse(c);
    }

    /**
     * Trợ lý AI chuyển khách sang tư vấn viên: lưu tóm tắt nhu cầu (hiện trên đầu hộp thư của admin),
     * thêm 1 tin hệ thống vào hội thoại và báo cho các tư vấn viên.
     */
    @Transactional
    public ConversationResponse handoffFromAi(UserPrincipal me, String summary) {
        Long id = getOrCreateForCustomer(me).id();
        Conversation c = conversationRepository.findWithUsersById(id).orElseThrow();
        c.setAiSummary(summary);
        if (c.getStatus() != ConversationStatus.ACTIVE) {
            c.setStatus(ConversationStatus.WAITING);
            c.setClosedAt(null);
        }
        Message sys = new Message();
        sys.setConversation(c);
        sys.setSenderType(SenderType.SYSTEM);
        sys.setType(MessageType.TEXT);
        sys.setContent("Bạn được chuyển từ Trợ lý AI sang tư vấn viên. Tư vấn viên đã xem nhu cầu của bạn và sẽ trả lời ngay.");
        messageRepository.save(sys);
        c.setLastMessageAt(LocalDateTime.now());
        c.setUnreadAdmin(c.getUnreadAdmin() + 1);
        conversationRepository.flush();
        ConversationResponse res = ConversationResponse.from(c, sys);
        broadcast(c, ChatEvent.message(MessageResponse.from(sys), res));
        return res;
    }

    // ===================== DÙNG CHUNG =====================

    @Transactional(readOnly = true)
    public MessagePage messages(UserPrincipal me, Long conversationId, Long beforeId) {
        loadWithAccess(me, conversationId);
        PageRequest page = PageRequest.of(0, PAGE_SIZE);
        List<Message> desc = beforeId == null
                ? messageRepository.findByConversationIdOrderByIdDesc(conversationId, page)
                : messageRepository.findByConversationIdAndIdLessThanOrderByIdDesc(conversationId, beforeId, page);
        List<MessageResponse> asc = new ArrayList<>(desc.stream().map(MessageResponse::from).toList());
        Collections.reverse(asc);
        return new MessagePage(asc, desc.size() == PAGE_SIZE);
    }

    @Transactional
    public MessageResponse send(UserPrincipal me, Long conversationId, SendMessageRequest req) {
        Conversation c = loadWithAccess(me, conversationId);
        boolean isAdmin = me.role() == Role.ADMIN;

        Message m = new Message();
        m.setConversation(c);
        m.setSender(userRepository.getReferenceById(me.id()));
        m.setSenderType(isAdmin ? SenderType.ADMIN : SenderType.CUSTOMER);
        m.setType(req.type());
        m.setContent(req.content() == null || req.content().isBlank() ? null : req.content().trim());
        fillByType(m, req);
        messageRepository.save(m);

        LocalDateTime now = LocalDateTime.now();
        c.setLastMessageAt(now);
        if (isAdmin) {
            c.setUnreadCustomer(c.getUnreadCustomer() + 1);
            c.setAdmin(userRepository.getReferenceById(me.id()));   // admin trả lời -> phụ trách hội thoại
            c.setStatus(ConversationStatus.ACTIVE);
        } else {
            c.setUnreadAdmin(c.getUnreadAdmin() + 1);
            if (c.getStatus() == ConversationStatus.CLOSED || c.getStatus() == ConversationStatus.AI) {
                c.setStatus(ConversationStatus.WAITING);              // khách nhắn lại -> mở lại hội thoại
                c.setClosedAt(null);
            }
        }
        conversationRepository.flush();
        Conversation fresh = conversationRepository.findWithUsersById(c.getId()).orElseThrow();
        MessageResponse dto = MessageResponse.from(m);
        broadcast(fresh, ChatEvent.message(dto, ConversationResponse.from(fresh, m)));
        return dto;
    }

    /** Đánh dấu đã đọc mọi tin của phía bên kia. */
    @Transactional
    public void markRead(UserPrincipal me, Long conversationId) {
        Conversation c = loadWithAccess(me, conversationId);
        LocalDateTime now = LocalDateTime.now();
        if (me.role() == Role.ADMIN) {
            if (c.getUnreadAdmin() == 0) return;
            c.setUnreadAdmin(0);
            messageRepository.markSeen(c.getId(), List.of(SenderType.CUSTOMER), now);
            notifier.toCustomer(c.getCustomer().getEmail(), ChatEvent.read(c.getId(), "ADMIN"));
            notifier.toAdmins(ChatEvent.conversation(toResponse(c)));
        } else {
            if (c.getUnreadCustomer() == 0) return;
            c.setUnreadCustomer(0);
            messageRepository.markSeen(c.getId(), List.of(SenderType.ADMIN, SenderType.AI, SenderType.SYSTEM), now);
            notifier.toAdmins(ChatEvent.read(c.getId(), "CUSTOMER"));
        }
    }

    /** Chuyển tiếp trạng thái "đang nhập..." (không lưu DB). */
    @Transactional(readOnly = true)
    public void typing(UserPrincipal me, Long conversationId, boolean typing) {
        Conversation c = loadWithAccess(me, conversationId);
        if (me.role() == Role.ADMIN) {
            notifier.toCustomer(c.getCustomer().getEmail(), ChatEvent.typing(c.getId(), "ADMIN", typing));
        } else {
            notifier.toAdmins(ChatEvent.typing(c.getId(), "CUSTOMER", typing));
        }
    }

    // ===================== ADMIN =====================

    @Transactional(readOnly = true)
    public List<ConversationResponse> listForAdmin(ConversationStatus status, String keyword) {
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();
        List<Conversation> list = conversationRepository.searchForAdmin(status, kw);
        if (list.isEmpty()) return List.of();
        Map<Long, Message> last = messageRepository.findLastMessages(list.stream().map(Conversation::getId).toList())
                .stream().collect(Collectors.toMap(m -> m.getConversation().getId(), Function.identity()));
        return list.stream().map(c -> ConversationResponse.from(c, last.get(c.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public ConversationResponse getForAdmin(Long id) {
        return toResponse(conversationRepository.findWithUsersById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hội thoại")));
    }

    @Transactional(readOnly = true)
    public long totalUnreadForAdmin() {
        return conversationRepository.totalUnreadForAdmin();
    }

    /** Kết thúc tư vấn: thêm 1 tin hệ thống và đổi trạng thái CLOSED. Khách nhắn tiếp sẽ tự mở lại. */
    @Transactional
    public ConversationResponse close(UserPrincipal admin, Long id) {
        Conversation c = conversationRepository.findWithUsersById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hội thoại"));
        if (c.getStatus() == ConversationStatus.CLOSED) return toResponse(c);
        Message sys = new Message();
        sys.setConversation(c);
        sys.setSenderType(SenderType.SYSTEM);
        sys.setType(MessageType.TEXT);
        sys.setContent(admin.fullName() + " đã kết thúc cuộc trò chuyện. Bạn có thể nhắn tiếp bất cứ lúc nào.");
        messageRepository.save(sys);
        c.setStatus(ConversationStatus.CLOSED);
        c.setClosedAt(LocalDateTime.now());
        c.setLastMessageAt(LocalDateTime.now());
        c.setUnreadCustomer(c.getUnreadCustomer() + 1);
        conversationRepository.flush();
        ConversationResponse res = ConversationResponse.from(c, sys);
        broadcast(c, ChatEvent.message(MessageResponse.from(sys), res));
        return res;
    }

    // ===================== NỘI BỘ =====================

    private Conversation loadWithAccess(UserPrincipal me, Long conversationId) {
        Conversation c = conversationRepository.findWithUsersById(conversationId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hội thoại"));
        if (me.role() != Role.ADMIN && !c.getCustomer().getId().equals(me.id())) {
            throw ApiException.forbidden("Bạn không có quyền xem hội thoại này");
        }
        return c;
    }

    /** Kiểm tra dữ liệu theo từng loại tin. */
    private void fillByType(Message m, SendMessageRequest req) {
        switch (req.type()) {
            case TEXT -> {
                if (m.getContent() == null) throw ApiException.badRequest("Tin nhắn trống");
            }
            case IMAGE, AUDIO, VIDEO, FILE -> {
                // Chỉ chấp nhận file đã tải lên server này, không nhận link ngoài
                if (req.fileUrl() == null || !req.fileUrl().matches("^/api/files/chat/[a-f0-9]{32}\\.[a-z0-9]{2,5}$")) {
                    throw ApiException.badRequest("File đính kèm không hợp lệ, hãy tải lên lại");
                }
                m.setFileUrl(req.fileUrl());
                m.setFileName(req.fileName());
                m.setFileSize(req.fileSize());
                m.setMimeType(req.mimeType());
            }
            case PRODUCT_CARD -> {
                if (req.productId() == null) throw ApiException.badRequest("Thiếu sản phẩm");
                m.setProduct(productRepository.findById(req.productId())
                        .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm")));
            }
            default -> throw ApiException.badRequest("Không thể gửi loại tin nhắn " + req.type());
        }
    }

    private void broadcast(Conversation c, ChatEvent event) {
        notifier.toAdmins(event);
        notifier.toCustomer(c.getCustomer().getEmail(), event);
    }

    private ConversationResponse toResponse(Conversation c) {
        Message last = c.getLastMessageAt() == null ? null
                : messageRepository.findLastMessages(List.of(c.getId())).stream().findFirst().orElse(null);
        return ConversationResponse.from(c, last);
    }
}
