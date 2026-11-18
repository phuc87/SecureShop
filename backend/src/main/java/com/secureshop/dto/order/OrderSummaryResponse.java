package com.secureshop.dto.order;

import com.secureshop.entity.Order;
import com.secureshop.entity.OrderItem;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.entity.enums.PaymentMethod;
import com.secureshop.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Một dòng trong danh sách đơn (khách và admin). */
public record OrderSummaryResponse(Long id, String orderCode, OrderStatus status, PaymentMethod paymentMethod,
                                   PaymentStatus paymentStatus, BigDecimal total, int itemCount,
                                   String firstItemName, String firstItemThumbnail, String receiverName,
                                   String receiverPhone, LocalDateTime createdAt) {

    public static OrderSummaryResponse from(Order o) {
        OrderItem first = o.getItems().isEmpty() ? null : o.getItems().get(0);
        int count = o.getItems().stream().mapToInt(OrderItem::getQuantity).sum();
        return new OrderSummaryResponse(o.getId(), o.getOrderCode(), o.getStatus(), o.getPaymentMethod(),
                o.getPaymentStatus(), o.getTotal(), count,
                first != null ? first.getProductName() : null, first != null ? first.getProductThumbnail() : null,
                o.getReceiverName(), o.getReceiverPhone(), o.getCreatedAt());
    }
}
