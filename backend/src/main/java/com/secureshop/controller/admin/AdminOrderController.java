package com.secureshop.controller.admin;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.order.OrderDetailResponse;
import com.secureshop.dto.order.OrderSummaryResponse;
import com.secureshop.dto.order.UpdateOrderStatusRequest;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.security.UserPrincipal;
import com.secureshop.exception.ApiException;
import com.secureshop.mail.EmailService;
import com.secureshop.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;
    private final EmailService emailService;

    /** GET /api/admin/orders?status=PENDING&q=0912&page=0 */
    @GetMapping
    public PageResponse<OrderSummaryResponse> search(@RequestParam(required = false) OrderStatus status,
                                                     @RequestParam(required = false) String q,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "15") int size) {
        return orderService.search(status, q, page, size);
    }

    /** Số đơn theo trạng thái: { PENDING: 3, CONFIRMED: 1, ..., ALL: 9 } */
    @GetMapping("/counts")
    public Map<String, Long> counts() {
        return orderService.countsByStatus();
    }

    @GetMapping("/{id}")
    public OrderDetailResponse detail(@PathVariable Long id) {
        return orderService.adminDetail(id);
    }

    /** body: { "status": "CONFIRMED", "note": "..." } (huỷ bắt buộc có note = lý do) */
    @PatchMapping("/{id}/status")
    public OrderDetailResponse updateStatus(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                            @Valid @RequestBody UpdateOrderStatusRequest request) {
        return orderService.adminUpdateStatus(me, id, request);
    }

    @PostMapping("/{id}/mark-paid")
    public OrderDetailResponse markPaid(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return orderService.markPaid(me, id);
    }

    /**
     * Gửi lại email cho khách (khi lần gửi trước lỗi).
     * type=confirmation: email xác nhận đơn; type=status: email báo trạng thái hiện tại.
     * Trả về chi tiết đơn (đã có dòng email_logs mới) để giao diện cập nhật ngay.
     */
    @PostMapping("/{id}/resend-email")
    public OrderDetailResponse resendEmail(@PathVariable Long id,
                                           @RequestParam(defaultValue = "confirmation") String type) {
        orderService.adminDetail(id); // 404 nếu không có đơn
        switch (type) {
            case "confirmation" -> emailService.resendOrderConfirmation(id);
            case "status" -> emailService.resendCurrentStatus(id);
            default -> throw ApiException.badRequest("Loại email không hợp lệ");
        }
        return orderService.adminDetail(id);
    }
}
