package com.secureshop.entity.enums;

import java.util.Map;
import java.util.Set;

/**
 * Vòng đời đơn hàng:
 *   PENDING (chờ xác nhận) -> CONFIRMED (đã xác nhận) -> SHIPPING (đang giao) -> COMPLETED (hoàn thành)
 *   Có thể huỷ (CANCELLED) khi chưa hoàn thành.
 */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPING,
    COMPLETED,
    CANCELLED;

    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(SHIPPING, CANCELLED),
            SHIPPING, Set.of(COMPLETED, CANCELLED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of());

    public boolean canChangeTo(OrderStatus target) {
        return NEXT.get(this).contains(target);
    }

    public Set<OrderStatus> nextStatuses() {
        return NEXT.get(this);
    }

    public String label() {
        return switch (this) {
            case PENDING -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case SHIPPING -> "Đang giao hàng";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã huỷ";
        };
    }
}
