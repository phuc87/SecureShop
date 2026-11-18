package com.secureshop.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm thử bộ xác minh token Google mà KHÔNG cần tài khoản Google thật:
 * tự tạo cặp khoá RSA, dựng 1 "máy chủ JWKS giả" trên máy, ký token giống hệt định dạng của Google.
 */
class GoogleTokenVerifierTest {

    static final String CLIENT_ID = "test-client.apps.googleusercontent.com";
    static HttpServer jwksServer;
    static KeyPair googleKey;      // khoá "của Google" (được công bố ở JWKS)
    static KeyPair attackerKey;    // khoá của kẻ giả mạo (không có trong JWKS)
    static String jwksUrl;
    static final AtomicInteger jwksRequests = new AtomicInteger();

    @BeforeAll
    static void startFakeGoogle() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        googleKey = gen.generateKeyPair();
        attackerKey = gen.generateKeyPair();
        RSAPublicKey pub = (RSAPublicKey) googleKey.getPublic();
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        String jwks = "{\"keys\":[{\"kty\":\"RSA\",\"alg\":\"RS256\",\"use\":\"sig\",\"kid\":\"kid-1\",\"n\":\""
                + b64.encodeToString(unsigned(pub.getModulus().toByteArray())) + "\",\"e\":\""
                + b64.encodeToString(unsigned(pub.getPublicExponent().toByteArray())) + "\"}]}";
        jwksServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        jwksServer.createContext("/certs", ex -> {
            jwksRequests.incrementAndGet();
            byte[] body = jwks.getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        jwksServer.start();
        jwksUrl = "http://127.0.0.1:" + jwksServer.getAddress().getPort() + "/certs";
    }

    @AfterAll
    static void stop() {
        jwksServer.stop(0);
    }

    private static byte[] unsigned(byte[] b) {
        return b.length > 1 && b[0] == 0 ? java.util.Arrays.copyOfRange(b, 1, b.length) : b;
    }

    private GoogleTokenVerifier verifier() {
        return new GoogleTokenVerifier(CLIENT_ID, jwksUrl, new ObjectMapper());
    }

    /** Token giống Google phát hành; tham số cho phép làm sai từng phần để kiểm tra. */
    private String token(KeyPair key, String kid, String iss, String aud, Instant exp, Boolean emailVerified, String email) {
        var b = Jwts.builder().header().keyId(kid).and()
                .issuer(iss).audience().add(aud).and().subject("1234567890")
                .issuedAt(Date.from(Instant.now().minusSeconds(10))).expiration(Date.from(exp))
                .claims(Map.of("name", "Nguyễn Tấn Phúc", "picture", "https://lh3.googleusercontent.com/a/x"));
        if (email != null) b.claim("email", email);
        if (emailVerified != null) b.claim("email_verified", emailVerified);
        return b.signWith(key.getPrivate(), Jwts.SIG.RS256).compact();
    }

    private String validToken() {
        return token(googleKey, "kid-1", "https://accounts.google.com", CLIENT_ID, Instant.now().plusSeconds(3600), true, "Khach.Moi@Gmail.com");
    }

    @Test
    @DisplayName("Token hợp lệ -> lấy được email (chữ thường), tên, ảnh")
    void validToken_ok() {
        var p = verifier().verify(validToken());
        assertThat(p).isPresent();
        assertThat(p.get().email()).isEqualTo("khach.moi@gmail.com");
        assertThat(p.get().name()).isEqualTo("Nguyễn Tấn Phúc");
        assertThat(p.get().picture()).startsWith("https://");
    }

    @Test
    @DisplayName("iss dạng không có https cũng hợp lệ (Google dùng cả 2)")
    void issuerWithoutScheme_ok() {
        String t = token(googleKey, "kid-1", "accounts.google.com", CLIENT_ID, Instant.now().plusSeconds(600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isPresent();
    }

    @Test
    @DisplayName("Chữ ký giả (ký bằng khoá không phải của Google) -> từ chối")
    void forgedSignature_rejected() {
        String t = token(attackerKey, "kid-1", "https://accounts.google.com", CLIENT_ID, Instant.now().plusSeconds(600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Token cấp cho website khác (aud khác) -> từ chối")
    void wrongAudience_rejected() {
        String t = token(googleKey, "kid-1", "https://accounts.google.com", "web-khac.apps.googleusercontent.com", Instant.now().plusSeconds(600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Không phải Google phát hành (iss khác) -> từ chối")
    void wrongIssuer_rejected() {
        String t = token(googleKey, "kid-1", "https://evil.example.com", CLIENT_ID, Instant.now().plusSeconds(600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Token hết hạn -> từ chối")
    void expired_rejected() {
        String t = token(googleKey, "kid-1", "https://accounts.google.com", CLIENT_ID, Instant.now().minusSeconds(3600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Email chưa được Google xác minh -> từ chối")
    void unverifiedEmail_rejected() {
        String t = token(googleKey, "kid-1", "https://accounts.google.com", CLIENT_ID, Instant.now().plusSeconds(600), false, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Khoá (kid) không có trong JWKS -> từ chối")
    void unknownKid_rejected() {
        String t = token(googleKey, "kid-khong-ton-tai", "https://accounts.google.com", CLIENT_ID, Instant.now().plusSeconds(600), true, "a@gmail.com");
        assertThat(verifier().verify(t)).isEmpty();
    }

    @Test
    @DisplayName("Chuỗi rác / sửa 1 ký tự trong token -> từ chối")
    void tampered_rejected() {
        String t = validToken();
        String tampered = t.substring(0, t.length() - 5) + (t.endsWith("A") ? "B" : "A") + t.substring(t.length() - 4);
        assertThat(verifier().verify("abc.def.ghi")).isEmpty();
        assertThat(verifier().verify(tampered)).isEmpty();
    }

    @Test
    @DisplayName("Chưa cấu hình Client ID -> tắt tính năng, từ chối mọi token")
    void disabled_whenNoClientId() {
        var v = new GoogleTokenVerifier("", jwksUrl, new ObjectMapper());
        assertThat(v.isEnabled()).isFalse();
        assertThat(v.verify(validToken())).isEmpty();
    }

    @Test
    @DisplayName("Khoá Google được lưu tạm: nhiều lần đăng nhập chỉ tải JWKS 1 lần")
    void keysAreCached() {
        var v = verifier();
        int before = jwksRequests.get();
        for (int i = 0; i < 5; i++) assertThat(v.verify(validToken())).isPresent();
        assertThat(jwksRequests.get() - before).isEqualTo(1);
    }
}
