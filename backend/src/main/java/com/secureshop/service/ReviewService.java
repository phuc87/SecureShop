package com.secureshop.service;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.review.CreateReviewRequest;
import com.secureshop.dto.review.ProductReviewsResponse;
import com.secureshop.dto.review.ReviewEligibilityResponse;
import com.secureshop.dto.review.ReviewResponse;
import com.secureshop.entity.Order;
import com.secureshop.entity.Product;
import com.secureshop.entity.ProductReview;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.OrderItemRepository;
import com.secureshop.repository.OrderRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.ProductReviewRepository;
import com.secureshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Đánh giá sản phẩm.
 * Quy tắc: chỉ khách đã mua và đơn đã HOÀN THÀNH mới được đánh giá; mỗi đơn đánh giá 1 lần cho mỗi sản phẩm.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ProductReviewsResponse forProduct(String slug, int page, int size) {
        Product product = productRepository.findBySlugAndStatus(slug, ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) distribution.put(star, 0L);
        long count = 0, sum = 0;
        for (Object[] row : reviewRepository.countByRating(product.getId())) {
            int star = ((Number) row[0]).intValue();
            long n = ((Number) row[1]).longValue();
            distribution.put(star, n);
            count += n;
            sum += (long) star * n;
        }
        double average = count == 0 ? 0 : Math.round(sum * 10.0 / count) / 10.0;

        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 20));
        PageResponse<ReviewResponse> reviews = PageResponse.from(
                reviewRepository.findByProductIdOrderByCreatedAtDescIdDesc(product.getId(), pageable), ReviewResponse::from);
        return new ProductReviewsResponse(average, count, distribution, reviews);
    }

    @Transactional(readOnly = true)
    public ReviewEligibilityResponse eligibility(Long userId, Long productId) {
        List<Object[]> completed = orderItemRepository.ordersContaining(userId, productId, OrderStatus.COMPLETED);
        if (completed.isEmpty()) {
            return ReviewEligibilityResponse.no(orderItemRepository.hasOrdered(userId, productId)
                    ? "Bạn đánh giá được sau khi đơn hàng có sản phẩm này được giao thành công (trạng thái Hoàn thành)."
                    : "Chỉ khách đã mua sản phẩm này mới viết được đánh giá.");
        }
        List<Long> reviewed = reviewRepository.reviewedOrderIds(userId, productId);
        for (Object[] row : completed) {
            Long orderId = (Long) row[0];
            if (!reviewed.contains(orderId)) return ReviewEligibilityResponse.yes(orderId, (String) row[1]);
        }
        return ReviewEligibilityResponse.no("Bạn đã đánh giá sản phẩm này rồi. Cảm ơn bạn!");
    }

    @Transactional
    public ReviewResponse create(Long userId, CreateReviewRequest req) {
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));

        Long orderId;
        if (req.orderId() != null) {
            boolean okOrder = orderItemRepository.ordersContaining(userId, product.getId(), OrderStatus.COMPLETED).stream()
                    .anyMatch(r -> req.orderId().equals(r[0]));
            if (!okOrder) {
                throw ApiException.badRequest("Đơn hàng này không phải của bạn, chưa hoàn thành hoặc không có sản phẩm này");
            }
            if (reviewRepository.reviewedOrderIds(userId, product.getId()).contains(req.orderId())) {
                throw ApiException.conflict("Bạn đã đánh giá sản phẩm này cho đơn hàng đó rồi");
            }
            orderId = req.orderId();
        } else {
            ReviewEligibilityResponse e = eligibility(userId, product.getId());
            if (!e.canReview()) throw ApiException.badRequest(e.reason());
            orderId = e.orderId();
        }

        ProductReview review = new ProductReview();
        review.setProduct(product);
        review.setUser(userRepository.getReferenceById(userId));
        review.setOrderId(orderId);
        review.setRating(req.rating());
        review.setComment(req.comment() == null || req.comment().isBlank() ? null : req.comment().trim());
        try {
            reviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException ex) { // bấm gửi 2 lần cùng lúc
            throw ApiException.conflict("Bạn đã đánh giá sản phẩm này cho đơn hàng đó rồi");
        }
        log.info("Khách #{} đánh giá {} sao sản phẩm #{} (đơn #{})", userId, req.rating(), product.getId(), orderId);
        return ReviewResponse.from(reviewRepository.findById(review.getId()).orElseThrow());
    }

    /** Sản phẩm nào trong đơn (của chính khách) đã được đánh giá. */
    @Transactional(readOnly = true)
    public List<Long> reviewedInOrder(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !order.getUser().getId().equals(userId)) {
            throw ApiException.notFound("Không tìm thấy đơn hàng");
        }
        return reviewRepository.reviewedProductIds(userId, orderId);
    }

    /** Admin xoá đánh giá không phù hợp (spam, ngôn từ xấu...). */
    @Transactional
    public void delete(Long reviewId) {
        ProductReview r = reviewRepository.findById(reviewId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy đánh giá"));
        reviewRepository.delete(r);
        log.info("Admin xoá đánh giá #{} của sản phẩm #{}", reviewId, r.getProduct().getId());
    }
}
