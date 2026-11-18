package com.secureshop.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Lấy IP thật của trình duyệt. Request đi qua proxy của Vite nên backend chỉ thấy 127.0.0.1;
 * Vite (xfwd: true trong vite.config.js) gắn IP gốc vào header X-Forwarded-For. Chỉ tin header này khi request đến từ chính máy chủ (proxy),
 * để người ngoài không giả IP được.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        boolean fromLocalProxy = "127.0.0.1".equals(remote) || "0:0:0:0:0:0:0:1".equals(remote) || "::1".equals(remote);
        String forwarded = request.getHeader("X-Forwarded-For");
        if (fromLocalProxy && forwarded != null && !forwarded.isBlank()) {
            // Proxy NỐI THÊM IP nó thấy vào CUỐI header -> lấy phần tử cuối.
            // (Phần tử đầu có thể do trình duyệt tự gửi để giả mạo, né giới hạn đăng nhập sai.)
            String[] parts = forwarded.split(",");
            String last = parts[parts.length - 1].trim();
            if (!last.isEmpty()) return last;
        }
        return remote;
    }
}
