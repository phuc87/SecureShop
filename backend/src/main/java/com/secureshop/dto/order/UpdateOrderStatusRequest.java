package com.secureshop.dto.order;

import com.secureshop.entity.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** note: ghi chú nội bộ / lý do huỷ (bắt buộc khi huỷ). */
public record UpdateOrderStatusRequest(
        @NotNull(message = "Thiếu trạng thái mới") OrderStatus status,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note
) {
}
