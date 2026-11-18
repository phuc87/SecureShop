package com.secureshop.mail;

import com.secureshop.dto.order.OrderEvents;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Nghe sự kiện đơn hàng và gửi email.
 * - AFTER_COMMIT: chỉ gửi khi đơn đã thực sự lưu xong (đơn lỗi / rollback thì không gửi nhầm).
 * - @Async: chạy ở luồng riêng, khách không phải chờ gửi mail xong mới thấy "Đặt hàng thành công".
 */
@Component
@RequiredArgsConstructor
public class OrderMailListener {

    private final EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPlaced(OrderEvents.Placed event) {
        emailService.sendOrderPlaced(event.orderId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStatusChanged(OrderEvents.StatusChanged event) {
        emailService.sendStatusChanged(event.orderId(), event.from(), event.to(), event.note());
    }
}
