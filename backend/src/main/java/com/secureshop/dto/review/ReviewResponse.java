package com.secureshop.dto.review;

import com.secureshop.entity.ProductReview;

import java.time.LocalDateTime;

public record ReviewResponse(Long id, int rating, String comment, String customerName,
                             String productName, String productSlug, LocalDateTime createdAt,
                             LocalDateTime updatedAt, Long orderId) {

    public static ReviewResponse from(ProductReview r) {
        return new ReviewResponse(r.getId(), r.getRating(), r.getComment(), shortName(r.getUser().getFullName()),
                r.getProduct().getName(), r.getProduct().getSlug(), r.getCreatedAt(), r.getUpdatedAt(), r.getOrderId());
    }

    /** Chỉ hiện tên + chữ cái đầu của họ để giữ riêng tư: "Nguyễn Văn An" -> "An N." */
    private static String shortName(String fullName) {
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[parts.length - 1] + " " + parts[0].charAt(0) + ".";
    }
}
