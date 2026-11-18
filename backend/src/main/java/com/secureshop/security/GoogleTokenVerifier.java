package com.secureshop.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.ProtectedHeader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kiểm tra "ID token" mà nút Đăng nhập với Google trả về cho trình duyệt.
 *
 * KHÔNG tin trình duyệt: tự kiểm tra lại ở server
 *  1. Chữ ký RS256 bằng khoá công khai của Google (tải từ JWKS, lưu tạm, tự làm mới khi Google đổi khoá)
 *  2. iss = accounts.google.com  (do Google phát hành)
 *  3. aud = Client ID của shop    (token cấp cho ĐÚNG website này, không phải web khác)
 *  4. Còn hạn, và email đã được Google xác minh
 */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final Duration KEYS_TTL = Duration.ofHours(6);

    private final String clientId;
    private final String jwksUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Map<String, PublicKey> keys = new ConcurrentHashMap<>();
    private volatile Instant keysLoadedAt = Instant.EPOCH;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId,
                               @Value("${app.google.jwks-url:https://www.googleapis.com/oauth2/v3/certs}") String jwksUrl,
                               ObjectMapper objectMapper) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.jwksUrl = jwksUrl;
        this.objectMapper = objectMapper;
    }

    /** Thông tin tài khoản Google đã được xác minh. */
    public record GoogleProfile(String subject, String email, String name, String picture) {
    }

    public boolean isEnabled() {
        return !clientId.isEmpty();
    }

    public String clientId() {
        return clientId;
    }

    /** Token hợp lệ -> thông tin người dùng; không hợp lệ (giả, hết hạn, cấp cho web khác...) -> empty. */
    public Optional<GoogleProfile> verify(String idToken) {
        if (!isEnabled() || idToken == null || idToken.isBlank()) return Optional.empty();
        try {
            Claims c = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(ProtectedHeader header) {
                            return keyFor(header.getKeyId());
                        }
                    })
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
            if (!ISSUERS.contains(c.getIssuer())) return fail("sai nơi phát hành: " + c.getIssuer());
            if (c.getAudience() == null || !c.getAudience().contains(clientId)) return fail("token không cấp cho website này");
            if (!Boolean.TRUE.equals(c.get("email_verified", Boolean.class))) return fail("email chưa được Google xác minh");
            String email = c.get("email", String.class);
            if (email == null || email.isBlank()) return fail("không có email");
            return Optional.of(new GoogleProfile(c.getSubject(), email.trim().toLowerCase(),
                    c.get("name", String.class), c.get("picture", String.class)));
        } catch (Exception e) {
            return fail(e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    private Optional<GoogleProfile> fail(String reason) {
        log.warn("Từ chối token Google: {}", reason);
        return Optional.empty();
    }

    /** Lấy khoá theo kid; chưa có (Google vừa đổi khoá) hoặc đã cũ thì tải lại JWKS. */
    private PublicKey keyFor(String kid) {
        if (kid == null) throw new IllegalArgumentException("Token thiếu kid");
        boolean stale = Instant.now().isAfter(keysLoadedAt.plus(KEYS_TTL));
        if (stale || !keys.containsKey(kid)) loadKeys();
        PublicKey key = keys.get(kid);
        if (key == null) throw new IllegalArgumentException("Không tìm thấy khoá Google kid=" + kid);
        return key;
    }

    private synchronized void loadKeys() {
        try {
            HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(jwksUrl))
                    .timeout(Duration.ofSeconds(8)).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());
            JsonNode jwks = objectMapper.readTree(res.body());
            KeyFactory rsa = KeyFactory.getInstance("RSA");
            Map<String, PublicKey> fresh = new ConcurrentHashMap<>();
            for (JsonNode k : jwks.path("keys")) {
                if (!"RSA".equals(k.path("kty").asText())) continue;
                BigInteger n = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("n").asText()));
                BigInteger e = new BigInteger(1, Base64.getUrlDecoder().decode(k.path("e").asText()));
                fresh.put(k.path("kid").asText(), rsa.generatePublic(new RSAPublicKeySpec(n, e)));
            }
            keys.clear();
            keys.putAll(fresh);
            keysLoadedAt = Instant.now();
            log.info("Đã tải {} khoá công khai của Google", fresh.size());
        } catch (Exception e) {
            log.warn("Không tải được khoá Google ({}): {}", jwksUrl, e.getMessage());
        }
    }
}
