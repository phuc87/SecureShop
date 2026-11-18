package com.secureshop.dto.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Sự kiện đẩy qua WebSocket. Frontend xem field "type" để xử lý:
 *  MESSAGE      : tin nhắn mới (message + conversation đã cập nhật)
 *  READ         : phía bên kia đã xem (by = CUSTOMER | ADMIN)
 *  CONVERSATION : hội thoại đổi trạng thái (đóng, có admin nhận...)
 *  TYPING       : phía bên kia đang nhập
 *  PRESENCE     : khách online/offline (gửi cho admin) hoặc có tư vấn viên online (gửi cho khách)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChatEvent(String type, Long conversationId, MessageResponse message, ConversationResponse conversation,
                        String by, Boolean typing, Long userId, Boolean online) {

    public static ChatEvent message(MessageResponse m, ConversationResponse c) {
        return new ChatEvent("MESSAGE", c.id(), m, c, null, null, null, null);
    }

    public static ChatEvent read(Long conversationId, String by) {
        return new ChatEvent("READ", conversationId, null, null, by, null, null, null);
    }

    public static ChatEvent conversation(ConversationResponse c) {
        return new ChatEvent("CONVERSATION", c.id(), null, c, null, null, null, null);
    }

    public static ChatEvent typing(Long conversationId, String by, boolean typing) {
        return new ChatEvent("TYPING", conversationId, null, null, by, typing, null, null);
    }

    public static ChatEvent presence(Long userId, boolean online) {
        return new ChatEvent("PRESENCE", null, null, null, null, null, userId, online);
    }
}
