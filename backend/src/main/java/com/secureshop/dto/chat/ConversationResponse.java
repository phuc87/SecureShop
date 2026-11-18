package com.secureshop.dto.chat;

import com.secureshop.entity.Conversation;
import com.secureshop.entity.Message;
import com.secureshop.entity.User;
import com.secureshop.entity.enums.ConversationStatus;
import com.secureshop.entity.enums.SenderType;

import java.time.LocalDateTime;

public record ConversationResponse(Long id, ConversationStatus status, Party customer, Party admin,
                                   String aiSummary, int unreadAdmin, int unreadCustomer,
                                   String lastMessagePreview, SenderType lastSenderType,
                                   LocalDateTime lastMessageAt, LocalDateTime createdAt) {

    public record Party(Long id, String fullName, String email, String phone, boolean online) {
        static Party of(User u) {
            return u == null ? null : new Party(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.isOnline());
        }
    }

    public static ConversationResponse from(Conversation c, Message last) {
        return new ConversationResponse(c.getId(), c.getStatus(), Party.of(c.getCustomer()), Party.of(c.getAdmin()),
                c.getAiSummary(), c.getUnreadAdmin(), c.getUnreadCustomer(),
                MessageResponse.preview(last), last != null ? last.getSenderType() : null,
                c.getLastMessageAt(), c.getCreatedAt());
    }
}
