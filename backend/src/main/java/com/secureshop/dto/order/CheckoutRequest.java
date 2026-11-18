package com.secureshop.dto.order;

import com.secureshop.entity.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Dữ liệu trang thanh toán. Client chỉ gửi mã sản phẩm + số lượng;
 * giá, phí ship, tổng tiền do server tự tính lại từ database (không tin giá client gửi lên).
 */
public record CheckoutRequest(
        @NotEmpty(message = "Giỏ hàng đang trống")
        @Size(max = 50, message = "Tối đa 50 sản phẩm khác nhau mỗi đơn")
        List<@Valid Item> items,

        @NotBlank(message = "Vui lòng nhập tên người nhận") @Size(max = 100) String receiverName,

        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại gồm 10 số, bắt đầu bằng 0")
        String receiverPhone,

        @NotBlank(message = "Vui lòng nhập email nhận xác nhận đơn")
        @Email(message = "Email không hợp lệ") @Size(max = 150)
        String receiverEmail,

        @NotBlank(message = "Vui lòng nhập Tỉnh / Thành phố") @Size(max = 100) String province,
        @NotBlank(message = "Vui lòng nhập Quận / Huyện") @Size(max = 100) String district,
        @NotBlank(message = "Vui lòng nhập Phường / Xã") @Size(max = 100) String ward,
        @NotBlank(message = "Vui lòng nhập số nhà, tên đường") @Size(max = 255) String street,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,

        @NotNull(message = "Vui lòng chọn phương thức thanh toán") PaymentMethod paymentMethod,

        /** Lưu địa chỉ này làm mặc định cho lần sau. */
        boolean saveAddress
) {
    public record Item(
            @NotNull(message = "Thiếu mã sản phẩm") Long productId,
            @Min(value = 1, message = "Số lượng tối thiểu là 1")
            @Max(value = 99, message = "Số lượng tối đa 99 mỗi sản phẩm") int quantity
    ) {
    }
}
