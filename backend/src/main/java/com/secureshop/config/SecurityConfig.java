package com.secureshop.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.secureshop.exception.ApiError;
import com.secureshop.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)              // API dùng JWT, không dùng cookie session
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // ===== BẢNG PHÂN QUYỀN (xem thêm docs/phan-quyen.md) =====
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        // 1. Ai cũng dùng được (khách vãng lai)
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/forgot-password",
                                "/api/auth/reset-password", "/api/auth/reset-password/check",
                                "/api/auth/google", "/api/auth/google/config").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/categories/**", "/api/brands/**",
                                "/api/reviews/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        // Trợ lý AI: khách vãng lai cũng hỏi được (đăng nhập rồi thì vẫn nhận ra là ai)
                        .requestMatchers("/api/ai/ask", "/api/ai/handoff", "/api/ai/feedback", "/api/ai/status").permitAll()
                        // File chat: tên file là chuỗi ngẫu nhiên 32 ký tự, không đoán được
                        .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                        // WebSocket: bắt tay HTTP mở, JWT được kiểm tra trong khung STOMP CONNECT
                        .requestMatchers("/ws", "/ws/**").permitAll()
                        // 2. Chỉ KHÁCH HÀNG: mua sắm (admin là nhân viên, không đặt hàng)
                        .requestMatchers("/api/cart/**", "/api/orders/**", "/api/favorites/**").hasRole("CUSTOMER")
                        // 3. Chỉ ADMIN: toàn bộ trang quản trị
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // 4. Còn lại (vd. /api/auth/me): chỉ cần đăng nhập, vai trò nào cũng được
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_UNAUTHORIZED, "Bạn chưa đăng nhập hoặc token đã hết hạn"))
                        .accessDeniedHandler((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_FORBIDDEN, "Bạn không có quyền thực hiện thao tác này")))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ApiError.of(status, message));
    }
}
