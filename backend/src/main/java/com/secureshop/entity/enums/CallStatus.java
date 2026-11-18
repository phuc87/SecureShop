package com.secureshop.entity.enums;

/** Trạng thái cuộc gọi (khớp CHECK chk_call_status của bảng call_logs). */
public enum CallStatus {
    RINGING,   // đang đổ chuông
    ACCEPTED,  // đang nói chuyện
    REJECTED,  // người nhận từ chối
    MISSED,    // không ai bắt máy / người gọi huỷ khi đang đổ chuông
    ENDED,     // đã nói chuyện xong
    FAILED     // rớt mạng, server khởi động lại giữa cuộc gọi
}
