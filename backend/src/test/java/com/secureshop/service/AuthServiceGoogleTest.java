package com.secureshop.service;

import com.secureshop.dto.auth.AuthResponse;
import com.secureshop.entity.User;
import com.secureshop.entity.enums.Role;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.UserRepository;
import com.secureshop.repository.VerificationTokenRepository;
import com.secureshop.security.GoogleTokenVerifier;
import com.secureshop.security.GoogleTokenVerifier.GoogleProfile;
import com.secureshop.security.JwtService;
import com.secureshop.security.LoginAttemptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Kiểm thử luồng "Đăng nhập với Google" trong AuthService (giả lập DB và Google bằng Mockito). */
class AuthServiceGoogleTest {

    UserRepository users;
    GoogleTokenVerifier google;
    JwtService jwt;
    AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        google = mock(GoogleTokenVerifier.class);
        jwt = mock(JwtService.class);
        when(google.isEnabled()).thenReturn(true);
        when(jwt.generateToken(any())).thenReturn("jwt-cua-shop");
        when(jwt.getExpirationSeconds()).thenReturn(86400L);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(99L);
            return u;
        });
        service = new AuthService(users, new BCryptPasswordEncoder(4), jwt, new LoginAttemptService(),
                mock(VerificationTokenRepository.class), google, mock(ApplicationEventPublisher.class));
    }

    private User existing(String email, Role role, boolean enabled) {
        User u = new User();
        u.setId(2L);
        u.setEmail(email);
        u.setFullName("Nguyễn Văn An");
        u.setPasswordHash("$2a$04$abcdefghijklmnopqrstuuJ8V8m3Yg9lK3rYJb5c4J0eS0Vb8n5y2");
        u.setRole(role);
        u.setEnabled(enabled);
        return u;
    }

    @Test
    @DisplayName("Email mới -> tự tạo tài khoản KHÁCH HÀNG, email đã xác minh, có ảnh đại diện")
    void newEmail_createsCustomer() {
        when(google.verify("tok")).thenReturn(Optional.of(new GoogleProfile("sub", "moi@gmail.com", "Trần Bình", "https://pic")));
        when(users.findByEmailIgnoreCase("moi@gmail.com")).thenReturn(Optional.empty());

        AuthResponse res = service.loginWithGoogle("tok");

        assertThat(res.accessToken()).isEqualTo("jwt-cua-shop");
        verify(users).save(argThat(u -> u.getEmail().equals("moi@gmail.com") && u.getRole() == Role.CUSTOMER
                && u.getFullName().equals("Trần Bình") && u.getPasswordHash().startsWith("$2")));
        assertThat(res.user().email()).isEqualTo("moi@gmail.com");
    }

    @Test
    @DisplayName("Không có tên Google -> dùng phần trước @ của email làm tên")
    void newEmail_withoutName_usesEmailPrefix() {
        when(google.verify("tok")).thenReturn(Optional.of(new GoogleProfile("sub", "binh.tran@gmail.com", null, null)));
        when(users.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        service.loginWithGoogle("tok");
        verify(users).save(argThat(u -> u.getFullName().equals("binh.tran")));
    }

    @Test
    @DisplayName("Email đã có tài khoản -> đăng nhập vào đúng tài khoản đó, không tạo mới, giữ nguyên vai trò")
    void existingEmail_linksAccount() {
        User admin = existing("admin@gmail.com", Role.ADMIN, true);
        when(google.verify("tok")).thenReturn(Optional.of(new GoogleProfile("sub", "admin@gmail.com", "X", "https://pic")));
        when(users.findByEmailIgnoreCase("admin@gmail.com")).thenReturn(Optional.of(admin));

        AuthResponse res = service.loginWithGoogle("tok");

        verify(users, never()).save(any());
        assertThat(res.user().id()).isEqualTo(2L);
        assertThat(res.user().role()).isEqualTo(Role.ADMIN);
        assertThat(admin.isEmailVerified()).isTrue();
        assertThat(admin.getAvatarUrl()).isEqualTo("https://pic");
    }

    @Test
    @DisplayName("Tài khoản bị khoá -> 403")
    void lockedAccount_forbidden() {
        when(google.verify("tok")).thenReturn(Optional.of(new GoogleProfile("sub", "an@gmail.com", "An", null)));
        when(users.findByEmailIgnoreCase("an@gmail.com")).thenReturn(Optional.of(existing("an@gmail.com", Role.CUSTOMER, false)));
        assertThatThrownBy(() -> service.loginWithGoogle("tok"))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Token Google không hợp lệ -> 401, không chạm vào DB")
    void invalidToken_unauthorized() {
        when(google.verify("gia")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.loginWithGoogle("gia"))
                .isInstanceOf(ApiException.class).extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(users);
    }

    @Test
    @DisplayName("Chưa cấu hình Google -> 503 kèm hướng dẫn")
    void notConfigured_serviceUnavailable() {
        when(google.isEnabled()).thenReturn(false);
        assertThatThrownBy(() -> service.loginWithGoogle("tok"))
                .isInstanceOf(ApiException.class).hasMessageContaining("GOOGLE_CLIENT_ID");
    }
}
