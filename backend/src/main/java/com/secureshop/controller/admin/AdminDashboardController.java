package com.secureshop.controller.admin;

import com.secureshop.exception.ApiException;
import com.secureshop.mail.EmailService;
import com.secureshop.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final DashboardService dashboardService;
    private final EmailService emailService;

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return dashboardService.stats();
    }

    /** Gửi 1 email thử tới địa chỉ nhận thông báo của shop để kiểm tra cấu hình Gmail. */
    @PostMapping("/system/test-email")
    public Map<String, Object> testEmail() {
        if (!emailService.isConfigured()) {
            throw ApiException.badRequest("Chưa cấu hình Gmail. Mở file backend/secrets.properties, điền MAIL_USERNAME "
                    + "và MAIL_APP_PASSWORD rồi khởi động lại backend.");
        }
        String to = emailService.notifyAddress();
        String error = emailService.sendTest(to);
        if (error != null) throw ApiException.badRequest("Gửi thất bại: " + error);
        return Map.of("sentTo", to);
    }
}
