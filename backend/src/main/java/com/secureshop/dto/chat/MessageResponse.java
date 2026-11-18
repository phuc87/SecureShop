package com.secureshop.dto.chat;

import com.secureshop.dto.product.ProductSummaryResponse;
import com.secureshop.entity.Message;
import com.secureshop.entity.enums.MessageType;
import com.secureshop.entity.enums.SenderType;

import java.time.LocalDateTime;

public record MessageResponse(Long id, Long conversationId, Long senderId, SenderType senderType, String senderName,
                              MessageType type, String content, String fileUrl, String fileName, Long fileSize,
                              String mimeType, ProductSummaryResponse product, LocalDateTime seenAt,
                              LocalDateTime createdAt) {

    public static MessageResponse from(Message m) {
        return new MessageResponse(m.getId(), m.getConversation().getId(),
                m.getSender() != null ? m.getSender().getId() : null, m.getSenderType(), senderName(m),
                m.getType(), m.getContent(), m.getFileUrl(), m.getFileName(), m.getFileSize(), m.getMimeType(),
                m.getProduct() != null ? ProductSummaryResponse.from(m.getProduct()) : null,
                m.getSeenAt(), m.getCreatedAt());
    }

    private static String senderName(Message m) {
        return switch (m.getSenderType()) {
            case AI -> "Trợ lý AI";
            case SYSTEM -> "Hệ thống";
            default -> m.getSender() != null ? m.getSender().getFullName() : "";
        };
    }

    /** Dòng xem trước trong danh sách hội thoại. */
    public static String preview(Message m) {
        if (m == null) return "";
        String text = switch (m.getType()) {
            case IMAGE -> "[Hình ảnh]";
            case AUDIO -> "[Tin nhắn thoại]";
            case VIDEO -> "[Video]";
            case FILE -> "[Tệp] " + m.getFileName();
            case PRODUCT_CARD -> "[Sản phẩm] " + (m.getProduct() != null ? m.getProduct().getName() : "");
            case CALL_LOG -> "[Cuộc gọi] " + m.getContent();
            default -> m.getContent();
        };
        if (text == null) text = "";
        return text.length() > 80 ? text.substring(0, 80) + "…" : text;
    }
}
