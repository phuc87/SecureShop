package com.secureshop.controller;

import com.secureshop.dto.auth.AuthResponse;
import com.secureshop.dto.auth.LoginRequest;
import com.secureshop.dto.auth.RegisterRequest;
import com.secureshop.dto.user.UserResponse;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    public record GoogleLoginRequest(@jakarta.validation.constraints.NotBlank(message = "Thiếu mã xác thực Google") String credential) {
    }

    /** Có bật đăng nhập Google không + Client ID để hiện nút (Client ID không phải bí mật). */
    @GetMapping("/google/config")
    public java.util.Map<String, Object> googleConfig() {
        return authService.googleConfig();
    }

    /** POST /api/auth/google { credential } -> giống đăng nhập thường (token + user) */
    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.loginWithGoogle(request.credential());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest http) {
        return authService.login(request, com.secureshop.util.ClientIp.of(http));
    }

    public record ForgotPasswordRequest(
            @jakarta.validation.constraints.NotBlank(message = "Vui lòng nhập email")
            @jakarta.validation.constraints.Email(message = "Email không hợp lệ") String email) {
    }

    public record ResetPasswordRequest(
            @jakarta.validation.constraints.NotBlank String token,
            @jakarta.validation.constraints.NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @jakarta.validation.constraints.Size(min = 8, max = 72, message = "Mật khẩu từ 8 đến 72 ký tự")
            @jakarta.validation.constraints.Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải có cả chữ và số")
            String newPassword) {
    }

    /** Luôn trả cùng một câu trả lời, dù email có tồn tại hay không. */
    @PostMapping("/forgot-password")
    public java.util.Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.email());
        return java.util.Map.of("message", "Nếu email này đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.");
    }

    @GetMapping("/reset-password/check")
    public java.util.Map<String, Object> checkResetToken(@RequestParam String token) {
        return authService.checkResetToken(token);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
    }

    /** Lấy thông tin người đang đăng nhập (frontend gọi khi tải lại trang để khôi phục phiên). */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal me) {
        return authService.me(me.id());
    }

    /** Sửa họ tên, số điện thoại của chính mình. */
    @PutMapping("/me")
    public UserResponse updateProfile(@AuthenticationPrincipal UserPrincipal me,
                                      @jakarta.validation.Valid @RequestBody com.secureshop.dto.user.UpdateProfileRequest request) {
        return authService.updateProfile(me.id(), request);
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal UserPrincipal me,
                               @jakarta.validation.Valid @RequestBody com.secureshop.dto.user.ChangePasswordRequest request) {
        authService.changePassword(me.id(), request);
    }
}
