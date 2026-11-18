package com.secureshop.websocket;

import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/** Tin nhắn STOMP từ client gửi lên (đích /app/...). Tin nhắn chính đi qua REST; ở đây chỉ có "đang nhập...". */
@Controller
@RequiredArgsConstructor
public class ChatWsController {

    private final ChatService chatService;

    public record TypingPayload(Long conversationId, boolean typing) {
    }

    @MessageMapping("/chat.typing")
    public void typing(TypingPayload payload, Principal principal) {
        if (payload == null || payload.conversationId() == null) return;
        if (principal instanceof UsernamePasswordAuthenticationToken auth && auth.getPrincipal() instanceof UserPrincipal me) {
            try {
                chatService.typing(me, payload.conversationId(), payload.typing());
            } catch (RuntimeException ignored) {
                // Không có quyền / hội thoại không tồn tại: bỏ qua, không làm rớt kết nối
            }
        }
    }
}
