package com.secureshop.websocket;

import com.secureshop.dto.chat.ChatEvent;
import com.secureshop.entity.enums.Role;
import com.secureshop.repository.UserRepository;
import com.secureshop.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Theo dõi ai đang online qua WebSocket (1 người có thể mở nhiều tab: đếm số phiên).
 * - Khách online/offline -> báo cho admin (chấm xanh trong hộp thư).
 * - Có/không có admin online -> báo cho khách ("Tư vấn viên đang online").
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceTracker {

    /** userId -> các phiên WebSocket đang mở (Spring có thể báo ngắt kết nối 2 lần cho 1 phiên, nên lưu theo id phiên). */
    private final Map<Long, java.util.Set<String>> sessions = new ConcurrentHashMap<>();
    private final Map<Long, Role> roles = new ConcurrentHashMap<>();
    private final Map<Long, String> emails = new ConcurrentHashMap<>();
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher events;

    /** Phát ra khi người dùng đóng tab/mất mạng ở phiên cuối cùng (CallService dùng để kết thúc cuộc gọi đang dở). */
    public record UserWentOffline(Long userId) {
    }
    private final SimpMessagingTemplate messaging;
    private final ChatNotifier notifier;

    @EventListener
    @Transactional
    public void onConnect(SessionConnectedEvent event) {
        UserPrincipal p = principal(event.getUser());
        if (p == null) return;
        String sessionId = org.springframework.messaging.simp.SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
        roles.put(p.id(), p.role());
        emails.put(p.id(), p.getUsername());
        java.util.Set<String> set = sessions.computeIfAbsent(p.id(), k -> ConcurrentHashMap.newKeySet());
        boolean first = set.isEmpty();
        set.add(sessionId);
        if (first) changed(p, true);
    }

    @EventListener
    @Transactional
    public void onDisconnect(SessionDisconnectEvent event) {
        UserPrincipal p = principal(event.getUser());
        if (p == null) return;
        java.util.Set<String> set = sessions.get(p.id());
        if (set == null || !set.remove(event.getSessionId())) return; // đã xử lý phiên này rồi
        if (set.isEmpty()) {
            sessions.remove(p.id());
            changed(p, false);
            events.publishEvent(new UserWentOffline(p.id()));
        }
    }

    public boolean isOnline(Long userId) {
        java.util.Set<String> set = sessions.get(userId);
        return set != null && !set.isEmpty();
    }

    /** Các admin đang online: id -> email (để đổ chuông cuộc gọi). */
    public Map<Long, String> onlineAdmins() {
        Map<Long, String> result = new java.util.LinkedHashMap<>();
        sessions.forEach((id, set) -> {
            if (!set.isEmpty() && roles.get(id) == Role.ADMIN) result.put(id, emails.get(id));
        });
        return result;
    }

    public boolean isSupportOnline() {
        return sessions.entrySet().stream()
                .anyMatch(e -> !e.getValue().isEmpty() && roles.get(e.getKey()) == Role.ADMIN);
    }

    private void changed(UserPrincipal p, boolean online) {
        userRepository.findById(p.id()).ifPresent(u -> {
            u.setOnline(online);
            if (!online) u.setLastSeenAt(LocalDateTime.now());
        });
        if (p.role() == Role.CUSTOMER) {
            messaging.convertAndSend(ChatNotifier.ADMIN_TOPIC, ChatEvent.presence(p.id(), online));
        } else {
            notifier.supportStatus(isSupportOnline());
        }
        log.debug("{} #{} {}", p.role(), p.id(), online ? "online" : "offline");
    }

    private static UserPrincipal principal(java.security.Principal user) {
        if (user instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal p) {
            return p;
        }
        return null;
    }
}
