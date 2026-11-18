package com.secureshop.security;

import com.secureshop.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Chống dò mật khẩu (brute force):
 *  - Một email sai 5 lần trong 15 phút -> khoá đăng nhập email đó 15 phút.
 *  - Một địa chỉ IP sai 20 lần trong 15 phút -> chặn IP đó 15 phút (thử nhiều email khác nhau).
 * Đếm cả với email không tồn tại, để kẻ tấn công không phân biệt được email nào có thật.
 * Lưu trong bộ nhớ (khởi động lại backend thì xoá) - đủ cho 1 máy chủ.
 */
@Slf4j
@Component
public class LoginAttemptService {

    public static final int MAX_PER_EMAIL = 5;
    private static final int MAX_PER_IP = 20;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final Duration LOCK = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Map<String, Instant> lockedUntil = new ConcurrentHashMap<>();

    /** Ném lỗi 429 nếu email hoặc IP đang bị khoá. */
    public void checkAllowed(String email, String ip) {
        for (String key : new String[]{emailKey(email), ipKey(ip)}) {
            Instant until = lockedUntil.get(key);
            if (until != null && until.isAfter(Instant.now())) {
                long minutes = Math.max(1, Duration.between(Instant.now(), until).toMinutes() + 1);
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, key.startsWith("ip:")
                        ? "Có quá nhiều lần đăng nhập sai từ thiết bị này. Vui lòng thử lại sau " + minutes + " phút."
                        : "Bạn đã nhập sai mật khẩu " + MAX_PER_EMAIL + " lần. Đăng nhập tạm khoá, thử lại sau "
                        + minutes + " phút hoặc dùng \"Quên mật khẩu\".");
            }
        }
    }

    /** Ghi nhận 1 lần sai. Trả về số lần còn được thử với email này (0 = vừa bị khoá). */
    public int recordFailure(String email, String ip) {
        int emailCount = add(emailKey(email), MAX_PER_EMAIL);
        add(ipKey(ip), MAX_PER_IP);
        return Math.max(0, MAX_PER_EMAIL - emailCount);
    }

    public void recordSuccess(String email) {
        failures.remove(emailKey(email));
        lockedUntil.remove(emailKey(email));
    }

    /** Sau khi đặt lại mật khẩu qua email thì mở khoá luôn. */
    public void reset(String email) {
        recordSuccess(email);
    }

    private int add(String key, int max) {
        Instant now = Instant.now();
        Deque<Instant> q = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst().isBefore(now.minus(WINDOW))) q.pollFirst();
            q.addLast(now);
            if (q.size() >= max) {
                lockedUntil.put(key, now.plus(LOCK));
                q.clear();
                log.warn("Khoá đăng nhập {} trong {} phút do sai quá {} lần", key, LOCK.toMinutes(), max);
                return max;
            }
            return q.size();
        }
    }

    private static String emailKey(String email) {
        return "email:" + (email == null ? "" : email.trim().toLowerCase(Locale.ROOT));
    }

    private static String ipKey(String ip) {
        return "ip:" + (ip == null ? "?" : ip);
    }
}
