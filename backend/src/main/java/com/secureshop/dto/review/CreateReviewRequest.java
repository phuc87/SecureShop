package com.secureshop.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Khách viết đánh giá. orderId có thể bỏ trống: hệ thống tự chọn đơn đã hoàn thành chưa đánh giá. */
public record CreateReviewRequest(
        @NotNull(message = "Thiếu sản phẩm") Long productId,
        Long orderId,
        @NotNull(message = "Vui lòng chọn số sao")
        @Min(value = 1, message = "Số sao từ 1 đến 5") @Max(value = 5, message = "Số sao từ 1 đến 5") Integer rating,
        @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự") String comment) {
}
