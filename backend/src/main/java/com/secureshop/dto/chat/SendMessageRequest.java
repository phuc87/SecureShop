package com.secureshop.dto.chat;

import com.secureshop.entity.enums.MessageType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * TEXT: cần content.
 * IMAGE / AUDIO / VIDEO / FILE: cần fileUrl (lấy từ API upload), content là chú thích (không bắt buộc).
 * PRODUCT_CARD: cần productId, content là lời nhắn kèm (không bắt buộc).
 */
public record SendMessageRequest(
        @NotNull(message = "Thiếu loại tin nhắn") MessageType type,
        @Size(max = 2000, message = "Tin nhắn tối đa 2000 ký tự") String content,
        @Size(max = 500) String fileUrl,
        @Size(max = 255) String fileName,
        Long fileSize,
        @Size(max = 100) String mimeType,
        Long productId
) {
}
