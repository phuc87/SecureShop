package com.secureshop.entity.enums;

public enum PaymentMethod {
    COD,            // thanh toán khi nhận hàng
    BANK_TRANSFER,  // chuyển khoản ngân hàng
    VNPAY;          // dự phòng cho bước tích hợp cổng thanh toán, hiện chưa nhận

    public String label() {
        return switch (this) {
            case COD -> "Thanh toán khi nhận hàng (COD)";
            case BANK_TRANSFER -> "Chuyển khoản ngân hàng";
            case VNPAY -> "VNPay";
        };
    }
}
