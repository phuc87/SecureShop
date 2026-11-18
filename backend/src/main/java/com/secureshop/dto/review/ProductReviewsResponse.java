package com.secureshop.dto.review;

import com.secureshop.dto.PageResponse;

import java.util.Map;

/**
 * Đánh giá của 1 sản phẩm.
 * distribution: { 5: 12, 4: 3, 3: 0, 2: 0, 1: 1 } (số lượt theo từng mức sao).
 */
public record ProductReviewsResponse(double average, long count, Map<Integer, Long> distribution,
                                     PageResponse<ReviewResponse> reviews) {
}
