package com.secureshop.dto.order;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secureshop.entity.EmailLog;
import com.secureshop.entity.Order;
import com.secureshop.entity.OrderItem;
import com.secureshop.entity.OrderStatusHistory;
import com.secureshop.entity.enums.EmailStatus;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.entity.enums.PaymentMethod;
import com.secureshop.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Chi tiết đơn. emails chỉ có khi admin xem (khách nhận null -> không xuất hiện trong JSON).
 * nextStatuses: các trạng thái được phép chuyển tiếp (admin dùng để hiện nút).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderDetailResponse(Long id, String orderCode, OrderStatus status, String statusLabel,
                                  Set<OrderStatus> nextStatuses, PaymentMethod paymentMethod, String paymentMethodLabel,
                                  PaymentStatus paymentStatus, String receiverName, String receiverPhone,
                                  String receiverEmail, String shippingAddress, String note, BigDecimal subtotal,
                                  BigDecimal shippingFee, BigDecimal discount, BigDecimal total, String cancelReason,
                                  Long customerId, String customerName, LocalDateTime createdAt, LocalDateTime updatedAt,
                                  List<Item> items, List<History> history, List<Email> emails) {

    public record Item(Long productId, String productSlug, String productName, String productSku,
                       String productThumbnail, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {
        static Item from(OrderItem i) {
            return new Item(i.getProduct() != null ? i.getProduct().getId() : null,
                    i.getProduct() != null ? i.getProduct().getSlug() : null,
                    i.getProductName(), i.getProductSku(), i.getProductThumbnail(), i.getUnitPrice(),
                    i.getQuantity(), i.getLineTotal());
        }
    }

    public record History(OrderStatus fromStatus, OrderStatus toStatus, String toLabel, String changedByName,
                          String note, LocalDateTime createdAt) {
        static History from(OrderStatusHistory h) {
            return new History(h.getFromStatus(), h.getToStatus(), h.getToStatus().label(),
                    h.getChangedBy() != null ? h.getChangedBy().getFullName() : null, h.getNote(), h.getCreatedAt());
        }
    }

    public record Email(Long id, String toEmail, String subject, String template, EmailStatus status,
                        String errorMessage, LocalDateTime sentAt, LocalDateTime createdAt) {
        public static Email from(EmailLog e) {
            return new Email(e.getId(), e.getToEmail(), e.getSubject(), e.getTemplate(), e.getStatus(),
                    e.getErrorMessage(), e.getSentAt(), e.getCreatedAt());
        }
    }

    public static OrderDetailResponse from(Order o, List<EmailLog> emails) {
        return new OrderDetailResponse(o.getId(), o.getOrderCode(), o.getStatus(), o.getStatus().label(),
                o.getStatus().nextStatuses(), o.getPaymentMethod(), o.getPaymentMethod().label(), o.getPaymentStatus(),
                o.getReceiverName(), o.getReceiverPhone(), o.getReceiverEmail(), o.getShippingAddress(), o.getNote(),
                o.getSubtotal(), o.getShippingFee(), o.getDiscount(), o.getTotal(), o.getCancelReason(),
                o.getUser() != null ? o.getUser().getId() : null, o.getUser() != null ? o.getUser().getFullName() : null,
                o.getCreatedAt(), o.getUpdatedAt(),
                o.getItems().stream().map(Item::from).toList(),
                o.getHistory().stream().map(History::from).toList(),
                emails == null ? null : emails.stream().map(Email::from).toList());
    }
}
