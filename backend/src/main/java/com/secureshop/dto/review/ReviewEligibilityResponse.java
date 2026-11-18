package com.secureshop.dto.review;

/**
 * Khách có được viết đánh giá cho sản phẩm không.
 * canReview=true kèm orderId/orderCode của đơn sẽ gắn với đánh giá.
 * canReview=false kèm reason để giao diện hiện câu giải thích.
 */
public record ReviewEligibilityResponse(boolean canReview, Long orderId, String orderCode, String reason) {

    public static ReviewEligibilityResponse yes(Long orderId, String orderCode) {
        return new ReviewEligibilityResponse(true, orderId, orderCode, null);
    }

    public static ReviewEligibilityResponse no(String reason) {
        return new ReviewEligibilityResponse(false, null, null, reason);
    }
}
