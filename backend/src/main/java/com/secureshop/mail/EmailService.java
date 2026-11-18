package com.secureshop.mail;

import com.secureshop.dto.order.OrderDetailResponse;
import com.secureshop.entity.EmailLog;
import com.secureshop.entity.Order;
import com.secureshop.entity.enums.EmailStatus;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.repository.EmailLogRepository;
import com.secureshop.repository.OrderRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Gửi email HTML qua Gmail SMTP, nội dung dựng từ template Thymeleaf (resources/templates/email/*.html).
 * Mỗi email đều được ghi vào bảng email_logs (SENT hoặc FAILED + lý do).
 * Chưa cấu hình Gmail thì KHÔNG gửi, chỉ ghi log FAILED, đơn hàng vẫn đặt bình thường.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Locale VI = Locale.forLanguageTag("vi-VN");

    private final JavaMailSender mailSender;
    private final ITemplateEngine templateEngine;
    private final EmailLogRepository emailLogRepository;
    private final OrderRepository orderRepository;
    private final com.secureshop.repository.UserRepository userRepository;
    private final com.secureshop.repository.ContactMessageRepository contactRepository;

    @Value("${spring.mail.username:}")
    private String username;
    @Value("${spring.mail.password:}")
    private String password;
    @Value("${app.mail.from-name}")
    private String fromName;
    @Value("${app.mail.admin-notify:}")
    private String adminNotify;
    @Value("${app.frontend-url}")
    private String frontendUrl;
    @Value("${app.shop.name}")
    private String shopName;
    @Value("${app.shop.hotline}")
    private String hotline;
    @Value("${app.shop.bank-name}")
    private String bankName;
    @Value("${app.shop.bank-account}")
    private String bankAccount;
    @Value("${app.shop.bank-holder}")
    private String bankHolder;

    public boolean isConfigured() {
        return !username.isBlank() && !password.isBlank();
    }

    public String senderAddress() {
        return username;
    }

    /** Email nhận thông báo đơn mới: ADMIN_NOTIFY_EMAIL, không đặt thì gửi về chính Gmail của shop. */
    public String notifyAddress() {
        return adminNotify.isBlank() ? username : adminNotify;
    }

    // ============================ EMAIL ĐƠN HÀNG ============================

    @Transactional
    public void sendOrderPlaced(Long orderId) {
        Order order = orderRepository.findWithUserById(orderId).orElse(null);
        if (order == null) return;
        OrderDetailResponse dto = OrderDetailResponse.from(order, null);

        Context ctx = baseContext(dto);
        ctx.setVariable("orderUrl", frontendUrl + "/account/orders/" + order.getId());
        send(order, order.getReceiverEmail(), "[" + shopName + "] Xác nhận đơn hàng " + order.getOrderCode(),
                "order-confirmation", ctx);

        String admin = notifyAddress();
        if (!admin.isBlank()) {
            Context adminCtx = baseContext(dto);
            adminCtx.setVariable("orderUrl", frontendUrl + "/admin/orders/" + order.getId());
            send(order, admin, "[" + shopName + "] Đơn hàng mới " + order.getOrderCode() + " - " + vnd(order.getTotal()),
                    "new-order-admin", adminCtx);
        }
    }

    @Transactional
    public void sendStatusChanged(Long orderId, OrderStatus from, OrderStatus to, String note) {
        Order order = orderRepository.findWithUserById(orderId).orElse(null);
        if (order == null) return;
        Context ctx = baseContext(OrderDetailResponse.from(order, null));
        ctx.setVariable("orderUrl", frontendUrl + "/account/orders/" + order.getId());
        ctx.setVariable("fromLabel", from.label());
        ctx.setVariable("toStatus", to.name());
        ctx.setVariable("toLabel", to.label());
        ctx.setVariable("note", note);
        send(order, order.getReceiverEmail(),
                "[" + shopName + "] Đơn hàng " + order.getOrderCode() + ": " + to.label(), "order-status-changed", ctx);
    }

    // ============================ GỬI LẠI (admin bấm) ============================

    /** Gửi lại email xác nhận đơn cho khách. Chạy ngay (không chạy nền) để admin biết kết quả. */
    @Transactional
    public EmailLog resendOrderConfirmation(Long orderId) {
        Order order = orderRepository.findWithUserById(orderId).orElseThrow();
        Context ctx = baseContext(OrderDetailResponse.from(order, null));
        ctx.setVariable("orderUrl", frontendUrl + "/account/orders/" + order.getId());
        return send(order, order.getReceiverEmail(), "[" + shopName + "] Xác nhận đơn hàng " + order.getOrderCode(),
                "order-confirmation", ctx);
    }

    /** Gửi lại email báo trạng thái hiện tại của đơn cho khách. */
    @Transactional
    public EmailLog resendCurrentStatus(Long orderId) {
        Order order = orderRepository.findWithUserById(orderId).orElseThrow();
        var last = order.getHistory().stream().filter(h -> h.getFromStatus() != h.getToStatus()).reduce((a, b) -> b).orElse(null);
        Context ctx = baseContext(OrderDetailResponse.from(order, null));
        ctx.setVariable("orderUrl", frontendUrl + "/account/orders/" + order.getId());
        ctx.setVariable("fromLabel", last != null && last.getFromStatus() != null ? last.getFromStatus().label() : "");
        ctx.setVariable("toStatus", order.getStatus().name());
        ctx.setVariable("toLabel", order.getStatus().label());
        ctx.setVariable("note", order.getStatus() == OrderStatus.CANCELLED ? order.getCancelReason() : (last != null ? last.getNote() : null));
        return send(order, order.getReceiverEmail(),
                "[" + shopName + "] Đơn hàng " + order.getOrderCode() + ": " + order.getStatus().label(), "order-status-changed", ctx);
    }

    // ============================ TÀI KHOẢN & LIÊN HỆ ============================

    @Transactional
    public void sendPasswordReset(Long userId, String rawToken, int minutes) {
        var user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        Context ctx = new Context(VI);
        ctx.setVariable("shopName", shopName);
        ctx.setVariable("hotline", hotline);
        ctx.setVariable("fullName", user.getFullName());
        ctx.setVariable("minutes", minutes);
        ctx.setVariable("resetUrl", frontendUrl + "/reset-password?token=" + rawToken);
        send(null, user.getEmail(), "[" + shopName + "] Đặt lại mật khẩu", "reset-password", ctx);
    }

    /** Báo cho shop khi khách gửi form Liên hệ. Bấm "Trả lời" trong Gmail là trả lời thẳng cho khách. */
    @Transactional
    public void sendContactNotice(Long contactId) {
        var c = contactRepository.findById(contactId).orElse(null);
        String to = notifyAddress();
        if (c == null || to.isBlank()) return;
        Context ctx = new Context(VI);
        ctx.setVariable("shopName", shopName);
        ctx.setVariable("hotline", hotline);
        ctx.setVariable("c", c);
        ctx.setVariable("subjectLabel", switch (c.getSubject()) {
            case TU_VAN -> "Tư vấn chọn thiết bị";
            case LAP_DAT -> "Khảo sát, lắp đặt";
            case BAO_HANH -> "Bảo hành, sửa chữa";
            case HOP_TAC -> "Hợp tác, đại lý";
            default -> "Khác";
        });
        ctx.setVariable("adminUrl", frontendUrl + "/admin/contacts");
        send(null, to, "[" + shopName + "] Liên hệ mới từ " + c.getFullName(), "contact-new", ctx, c.getEmail());
    }

    /** Gửi thử (nút trong trang Tổng quan của admin). Trả null nếu thành công, ngược lại là lý do lỗi. */
    @Transactional
    public String sendTest(String to) {
        Context ctx = new Context(VI);
        ctx.setVariable("shopName", shopName);
        ctx.setVariable("hotline", hotline);
        ctx.setVariable("sentAt", LocalDateTime.now());
        EmailLog result = send(null, to, "[" + shopName + "] Email thử nghiệm", "test-email", ctx);
        return result.getStatus() == EmailStatus.SENT ? null : result.getErrorMessage();
    }

    // ================================ NỘI BỘ ================================

    private Context baseContext(OrderDetailResponse order) {
        Context ctx = new Context(VI);
        ctx.setVariable("order", order);
        ctx.setVariable("shopName", shopName);
        ctx.setVariable("hotline", hotline);
        ctx.setVariable("frontendUrl", frontendUrl);
        ctx.setVariable("bankName", bankName);
        ctx.setVariable("bankAccount", bankAccount);
        ctx.setVariable("bankHolder", bankHolder);
        return ctx;
    }

    private EmailLog send(Order order, String to, String subject, String template, Context ctx) {
        return send(order, to, subject, template, ctx, null);
    }

    private EmailLog send(Order order, String to, String subject, String template, Context ctx, String replyTo) {
        EmailLog entry = new EmailLog();
        entry.setToEmail(to);
        entry.setSubject(subject.length() > 255 ? subject.substring(0, 255) : subject);
        entry.setTemplate(template);
        entry.setRelatedOrder(order);

        if (!isConfigured()) {
            entry.setStatus(EmailStatus.FAILED);
            entry.setErrorMessage("Chưa cấu hình Gmail: đặt MAIL_USERNAME và MAIL_APP_PASSWORD trong backend/secrets.properties rồi khởi động lại backend");
            return emailLogRepository.save(entry);
        }
        try {
            String html = templateEngine.process("email/" + template, ctx);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(new InternetAddress(username, fromName, "UTF-8"));
            helper.setTo(to);
            if (replyTo != null && !replyTo.isBlank()) helper.setReplyTo(replyTo);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            entry.setStatus(EmailStatus.SENT);
            entry.setSentAt(LocalDateTime.now());
            log.info("Đã gửi email '{}' tới {}", template, to);
        } catch (Exception e) {
            entry.setStatus(EmailStatus.FAILED);
            entry.setErrorMessage(friendlyError(e));
            log.warn("Gửi email '{}' tới {} thất bại: {}", template, to, e.getMessage());
        }
        return emailLogRepository.save(entry);
    }

    /** Đổi lỗi kỹ thuật của SMTP thành câu dễ hiểu. */
    private static String friendlyError(Exception e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        String raw = String.valueOf(root.getMessage());
        String msg;
        if (raw.contains("535") || raw.contains("Username and Password not accepted")) {
            msg = "Gmail từ chối đăng nhập: sai MAIL_USERNAME hoặc App Password (không dùng mật khẩu Gmail thường)";
        } else if (raw.contains("UnknownHost") || raw.contains("Couldn't connect") || raw.contains("connect timed out")) {
            msg = "Không kết nối được máy chủ Gmail (kiểm tra mạng / tường lửa cổng 587)";
        } else {
            msg = raw;
        }
        return msg.length() > 1000 ? msg.substring(0, 1000) : msg;
    }

    private static String vnd(BigDecimal amount) {
        DecimalFormat f = new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(VI));
        return f.format(amount) + " ₫";
    }
}
