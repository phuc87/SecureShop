package com.secureshop.websocket;

import com.secureshop.entity.enums.Role;
import com.secureshop.repository.UserRepository;
import com.secureshop.security.JwtService;
import com.secureshop.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Bảo mật WebSocket:
 *  - CONNECT: bắt buộc gửi header "Authorization: Bearer <JWT>", sai thì từ chối kết nối.
 *  - SUBSCRIBE: kênh /topic/admin/** chỉ ADMIN được nghe; khách chỉ nghe kênh riêng /user/queue/** và /topic/public/**.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
            UserPrincipal principal = (token == null ? java.util.Optional.<Long>empty() : jwtService.extractUserId(token))
                    .flatMap(userRepository::findById)
                    .filter(u -> u.isEnabled())
                    .map(UserPrincipal::from)
                    .orElseThrow(() -> new AccessDeniedException("Token không hợp lệ"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String dest = accessor.getDestination();
            UserPrincipal me = principalOf(accessor);
            boolean allowed = dest != null && (
                    dest.startsWith("/user/queue/")
                            || dest.startsWith("/topic/public/")
                            || (dest.startsWith("/topic/admin/") && me != null && me.role() == Role.ADMIN));
            if (!allowed) throw new AccessDeniedException("Không được nghe kênh " + dest);
        }
        return message;
    }

    static UserPrincipal principalOf(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal p) {
            return p;
        }
        return null;
    }
}
