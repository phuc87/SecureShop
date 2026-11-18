package com.secureshop.service;

import com.secureshop.dto.auth.AuthResponse;
import com.secureshop.dto.auth.LoginRequest;
import com.secureshop.dto.auth.RegisterRequest;
import com.secureshop.dto.user.UserResponse;
import com.secureshop.entity.User;
import com.secureshop.entity.VerificationToken;
import com.secureshop.entity.enums.Role;
import com.secureshop.entity.enums.TokenType;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.UserRepository;
import com.secureshop.repository.VerificationTokenRepository;
import com.secureshop.security.GoogleTokenVerifier;
import com.secureshop.security.JwtService;
import com.secureshop.security.LoginAttemptService;
import com.secureshop.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int RESET_MINUTES = 30;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttempts;
    private final VerificationTokenRepository tokenRepository;
    private final GoogleTokenVerifier googleVerifier;
    private final ApplicationEventPublisher events;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Email này đã được đăng ký");
        }
        User user = new User();
        user.setFullName(req.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone());
        user.setRole(Role.CUSTOMER);              // đăng ký công khai luôn là khách hàng
        userRepository.save(user);
        return buildResponse(user);
    }

    /**
     * Đăng nhập bằng Google. credential = ID token do nút "Đăng nhập với Google" trả về.
     *  - Email đã có tài khoản -> đăng nhập vào tài khoản đó (đánh dấu email đã xác minh).
     *  - Chưa có -> tự tạo tài khoản KHÁCH HÀNG. Mật khẩu là chuỗi ngẫu nhiên không ai biết;
     *    muốn đăng nhập bằng mật khẩu thì dùng "Quên mật khẩu" để đặt.
     */
    @Transactional
    public AuthResponse loginWithGoogle(String credential) {
        if (!googleVerifier.isEnabled()) {
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa bật đăng nhập Google (thiếu GOOGLE_CLIENT_ID trong backend/secrets.properties)");
        }
        GoogleTokenVerifier.GoogleProfile g = googleVerifier.verify(credential)
                .orElseThrow(() -> ApiException.unauthorized("Không xác thực được tài khoản Google, vui lòng thử lại"));
        User user = userRepository.findByEmailIgnoreCase(g.email()).orElse(null);
        if (user == null) {
            user = new User();
            String name = g.name() == null || g.name().isBlank() ? g.email().substring(0, g.email().indexOf('@')) : g.name().trim();
            user.setFullName(name.length() > 100 ? name.substring(0, 100) : name);
            user.setEmail(g.email());
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            user.setPasswordHash(passwordEncoder.encode(Base64.getEncoder().encodeToString(random)));
            user.setRole(Role.CUSTOMER);   // đăng nhập Google lần đầu luôn là khách hàng
            userRepository.save(user);
        } else if (!user.isEnabled()) {
            throw ApiException.forbidden("Tài khoản đã bị khóa, vui lòng liên hệ cửa hàng");
        }
        user.setEmailVerified(true);       // Google đã xác minh email này
        if (user.getAvatarUrl() == null && g.picture() != null && g.picture().length() <= 500) user.setAvatarUrl(g.picture());
        loginAttempts.recordSuccess(g.email());
        return buildResponse(user);
    }

    public java.util.Map<String, Object> googleConfig() {
        return googleVerifier.isEnabled()
                ? java.util.Map.of("enabled", true, "clientId", googleVerifier.clientId())
                : java.util.Map.of("enabled", false);
    }

    /** ip: địa chỉ của trình duyệt, dùng để chặn dò mật khẩu (xem LoginAttemptService). */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req, String ip) {
        String email = req.email().trim();
        loginAttempts.checkAllowed(email, ip);
        User user = userRepository.findByEmailIgnoreCase(email)
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            int left = loginAttempts.recordFailure(email, ip);
            // Cùng một thông báo cho sai email và sai mật khẩu để không lộ email nào đã tồn tại
            if (left == 0) {
                throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                        "Bạn đã nhập sai " + LoginAttemptService.MAX_PER_EMAIL
                                + " lần. Đăng nhập tạm khoá 15 phút, hoặc dùng \"Quên mật khẩu\" để đặt lại.");
            }
            throw ApiException.unauthorized("Email hoặc mật khẩu không đúng" + (left <= 2 ? " (còn " + left + " lần thử)" : ""));
        }
        if (!user.isEnabled()) {
            throw ApiException.forbidden("Tài khoản đã bị khóa, vui lòng liên hệ cửa hàng");
        }
        loginAttempts.recordSuccess(email);
        return buildResponse(user);
    }

    // ============================ QUÊN MẬT KHẨU ============================

    /**
     * Gửi link đặt lại mật khẩu (hiệu lực 30 phút). Luôn trả về như nhau dù email có tồn tại hay không,
     * để không ai dùng chức năng này dò được email nào đã đăng ký. Mỗi email tối đa 3 lần / 15 phút.
     */
    @Transactional
    public void requestPasswordReset(String rawEmail) {
        User user = userRepository.findByEmailIgnoreCase(rawEmail.trim()).filter(User::isEnabled).orElse(null);
        if (user == null) return;
        LocalDateTime now = LocalDateTime.now();
        if (tokenRepository.countByUserIdAndTypeAndCreatedAtAfter(user.getId(), TokenType.RESET_PASSWORD, now.minusMinutes(15)) >= 3) {
            return;
        }
        tokenRepository.invalidateAll(user.getId(), TokenType.RESET_PASSWORD, now);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        VerificationToken t = new VerificationToken();
        t.setUser(user);
        t.setType(TokenType.RESET_PASSWORD);
        t.setToken(sha256(rawToken));
        t.setExpiresAt(now.plusMinutes(RESET_MINUTES));
        tokenRepository.save(t);
        // Mã thật chỉ nằm trong email, gửi sau khi commit
        events.publishEvent(new PasswordResetRequested(user.getId(), rawToken, RESET_MINUTES));
    }

    public record PasswordResetRequested(Long userId, String rawToken, int minutes) {
    }

    /** Trang đặt lại mật khẩu gọi để biết link còn dùng được không (hiện email đã che bớt). */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> checkResetToken(String rawToken) {
        return findUsableToken(rawToken)
                .<java.util.Map<String, Object>>map(t -> java.util.Map.of("valid", true, "email", maskEmail(t.getUser().getEmail())))
                .orElse(java.util.Map.of("valid", false));
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        VerificationToken t = findUsableToken(rawToken)
                .orElseThrow(() -> ApiException.badRequest("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi yêu cầu mới."));
        User user = t.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        t.setUsedAt(LocalDateTime.now());
        loginAttempts.reset(user.getEmail());
    }

    private java.util.Optional<VerificationToken> findUsableToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 100) return java.util.Optional.empty();
        return tokenRepository.findByTokenAndType(sha256(rawToken.trim()), TokenType.RESET_PASSWORD).filter(VerificationToken::isUsable);
    }

    private static String sha256(String s) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** "phucaipro123@gmail.com" -> "ph*********@gmail.com" */
    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 2) return email;
        return email.substring(0, 2) + "*".repeat(at - 2) + email.substring(at);
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return userRepository.findById(userId).map(UserResponse::from)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
    }

    /** Sửa họ tên, số điện thoại. Email là tên đăng nhập nên không cho đổi ở đây. */
    @Transactional
    public UserResponse updateProfile(Long userId, com.secureshop.dto.user.UpdateProfileRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        user.setFullName(req.fullName().trim());
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone());
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(Long userId, com.secureshop.dto.user.ChangePasswordRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(UserPrincipal.from(user));
        return AuthResponse.bearer(token, jwtService.getExpirationSeconds(), UserResponse.from(user));
    }
}
