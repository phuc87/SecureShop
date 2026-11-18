package com.secureshop.dto.order;

import com.secureshop.entity.enums.OrderStatus;

/** Sự kiện nghiệp vụ của đơn hàng. Chỉ chứa id để bên nghe tự tải dữ liệu mới nhất sau khi commit. */
public final class OrderEvents {

    private OrderEvents() {
    }

    public record Placed(Long orderId) {
    }

    public record StatusChanged(Long orderId, OrderStatus from, OrderStatus to, String note) {
    }
}
