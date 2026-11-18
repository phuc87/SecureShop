package com.secureshop.controller;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.order.CancelOrderRequest;
import com.secureshop.dto.order.CheckoutRequest;
import com.secureshop.dto.order.OrderDetailResponse;
import com.secureshop.dto.order.OrderSummaryResponse;
import com.secureshop.security.UserPrincipal;
import com.secureshop.dto.review.CreateReviewRequest;
import com.secureshop.dto.review.ReviewEligibilityResponse;
import com.secureshop.dto.review.ReviewResponse;
import com.secureshop.service.OrderService;
import com.secureshop.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Đơn hàng của khách (chỉ CUSTOMER, cấu hình trong SecurityConfig: /api/orders/**). */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final ReviewService reviewService;
    private final com.secureshop.service.VoucherService voucherService;

    /** Đặt hàng. Trả về chi tiết đơn vừa tạo (có mã đơn). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDetailResponse checkout(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody CheckoutRequest request) {
        return orderService.placeOrder(me, request);
    }

    @GetMapping
    public PageResponse<OrderSummaryResponse> myOrders(@AuthenticationPrincipal UserPrincipal me,
                                                       @RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size) {
        return orderService.myOrders(me, page, size);
    }

    @GetMapping("/{id}")
    public OrderDetailResponse myOrder(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return orderService.myOrder(me, id);
    }

    /** Khách tự huỷ (chỉ khi đơn đang chờ xác nhận). */
    @PostMapping("/{id}/cancel")
    public OrderDetailResponse cancel(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                      @Valid @RequestBody(required = false) CancelOrderRequest request) {
        return orderService.cancelByCustomer(me, id, request == null ? null : request.reason());
    }

    /** Địa chỉ đã lưu để điền sẵn ở trang thanh toán: { "address": {...} } hoặc {} nếu chưa có. */
    @GetMapping("/default-address")
    public Map<String, Object> defaultAddress(@AuthenticationPrincipal UserPrincipal me) {
        return orderService.defaultAddress(me);
    }

    // ============================ ĐÁNH GIÁ SẢN PHẨM ============================

    /** GET /api/orders/review-eligibility?productId=5 : khách có được đánh giá sản phẩm này không. */
    @GetMapping("/review-eligibility")
    public ReviewEligibilityResponse reviewEligibility(@AuthenticationPrincipal UserPrincipal me,
                                                       @RequestParam Long productId) {
        return reviewService.eligibility(me.id(), productId);
    }

    /** POST /api/orders/reviews  body: { productId, orderId?, rating, comment } */
    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse createReview(@AuthenticationPrincipal UserPrincipal me,
                                       @Valid @RequestBody CreateReviewRequest request) {
        return reviewService.create(me.id(), request);
    }

    /** GET /api/orders/{id}/reviewed-products : [productId...] đã đánh giá trong đơn này. */
    @GetMapping("/{id}/reviewed-products")
    public List<Long> reviewedProducts(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return reviewService.reviewedInOrder(me.id(), id);
    }

    // ============================ MÃ GIẢM GIÁ ============================

    /** POST /api/orders/voucher-quote { code, items } : áp thử mã, trả về số tiền giảm và tổng mới. */
    @PostMapping("/voucher-quote")
    public com.secureshop.dto.voucher.VoucherDtos.VoucherQuote voucherQuote(
            @AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody com.secureshop.dto.voucher.VoucherDtos.QuoteRequest req) {
        return voucherService.quote(me.id(), req);
    }
}
