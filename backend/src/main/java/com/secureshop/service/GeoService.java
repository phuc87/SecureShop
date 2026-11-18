package com.secureshop.service;

import com.secureshop.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Gọi OpenStreetMap Nominatim THAY trình duyệt (đổi toạ độ <-> địa chỉ cho bản đồ ở trang thanh toán).
 * Vì sao qua backend: Nominatim bắt buộc ứng dụng tự giới thiệu (User-Agent) và giới hạn 1 request/giây,
 * gọi thẳng từ trình duyệt hay bị từ chối. Ở đây có: User-Agent riêng, xếp hàng 1 request/giây, bộ nhớ đệm.
 */
@Slf4j
@Service
public class GeoService {

    private static final String BASE = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "SecureShop/1.0 (do an tot nghiep - website thiet bi an ninh)";
    private static final long MIN_GAP_MS = 1100;
    private static final int CACHE_SIZE = 500;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
    private long lastCall = 0;

    /** Bộ nhớ đệm đơn giản (bỏ mục cũ nhất khi đầy): cùng 1 điểm / 1 từ khoá không gọi lại Nominatim. */
    private final Map<String, String> cache = java.util.Collections.synchronizedMap(new LinkedHashMap<>(64, .75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, String> e) {
            return size() > CACHE_SIZE;
        }
    });

    public String reverse(double lat, double lon) {
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw ApiException.badRequest("Toạ độ không hợp lệ");
        // làm tròn ~1m để tận dụng bộ nhớ đệm
        String url = String.format(Locale.ROOT, "%s/reverse?format=jsonv2&addressdetails=1&accept-language=vi&zoom=18&lat=%.5f&lon=%.5f",
                BASE, lat, lon);
        return fetch(url);
    }

    public String search(String q) {
        if (q == null || q.isBlank() || q.length() > 200) throw ApiException.badRequest("Vui lòng nhập địa chỉ cần tìm");
        String url = BASE + "/search?format=jsonv2&limit=5&countrycodes=vn&addressdetails=1&accept-language=vi&q="
                + URLEncoder.encode(q.trim(), StandardCharsets.UTF_8);
        return fetch(url);
    }

    private String fetch(String url) {
        String hit = cache.get(url);
        if (hit != null) return hit;
        try {
            waitTurn();
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/json")
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() != 200) {
                log.warn("Nominatim trả {} cho {}", res.statusCode(), url);
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Dịch vụ bản đồ đang bận, bạn thử lại sau hoặc nhập tay");
            }
            cache.put(url, res.body());
            return res.body();
        } catch (ApiException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Không kết nối được dịch vụ bản đồ");
        } catch (Exception e) {
            log.warn("Không gọi được Nominatim: {}", e.toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Không kết nối được dịch vụ bản đồ (kiểm tra Internet)");
        }
    }

    /** Xếp hàng: 2 request liên tiếp tới Nominatim cách nhau ít nhất 1,1 giây (theo quy định của họ). */
    private synchronized void waitTurn() throws InterruptedException {
        long wait = lastCall + MIN_GAP_MS - System.currentTimeMillis();
        if (wait > 0) Thread.sleep(wait);
        lastCall = System.currentTimeMillis();
    }
}
