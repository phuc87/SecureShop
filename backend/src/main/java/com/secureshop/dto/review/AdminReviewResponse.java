package com.secureshop.dto.review;

import com.secureshop.entity.ProductReview;

import java.time.LocalDateTime;

/** Đánh giá hiển thị ở trang quản trị: đủ tên + email khách để admin liên hệ khi cần. */
public record AdminReviewResponse(Long id, int rating, String comment,
                                  String customerName, String customerEmail,
                                  String productName, String productSlug, String productThumbnail,
                                  Long orderId, boolean adminSeen, LocalDateTime createdAt,
                                  LocalDateTime updatedAt) {

    public static AdminReviewResponse from(ProductReview r) {
        return new AdminReviewResponse(r.getId(), r.getRating(), r.getComment(),
                r.getUser().getFullName(), r.getUser().getEmail(),
                r.getProduct().getName(), r.getProduct().getSlug(), r.getProduct().getThumbnailUrl(),
                r.getOrderId(), r.isAdminSeen(), r.getCreatedAt(), r.getUpdatedAt());
    }
}
