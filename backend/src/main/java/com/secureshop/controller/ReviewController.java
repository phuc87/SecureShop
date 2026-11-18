package com.secureshop.controller;

import com.secureshop.dto.review.ReviewResponse;
import com.secureshop.repository.ProductReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ProductReviewRepository reviewRepository;

    /** Đánh giá 4-5 sao mới nhất, hiện ở trang chủ. GET /api/reviews/latest?limit=6 */
    @GetMapping("/latest")
    @Transactional(readOnly = true)
    public List<ReviewResponse> latest(@RequestParam(defaultValue = "6") int limit) {
        return reviewRepository.findLatest(4, PageRequest.of(0, Math.min(Math.max(limit, 1), 12))).stream()
                .map(ReviewResponse::from).toList();
    }
}
