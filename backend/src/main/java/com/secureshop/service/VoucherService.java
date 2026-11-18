package com.secureshop.service;

import com.secureshop.dto.order.CheckoutRequest;
import com.secureshop.dto.voucher.VoucherDtos.*;
import com.secureshop.entity.Product;
import com.secureshop.entity.Voucher;
import com.secureshop.entity.enums.DiscountType;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.OrderRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Mã giảm giá.
 * Quy tắc: giảm trên TIỀN HÀNG (không giảm phí ship); miễn phí ship vẫn tính theo tiền hàng trước khi giảm.
 * Mỗi đơn dùng tối đa 1 mã. Đơn bị huỷ thì trả lại lượt dùng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherService {

    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    /** Mã là "bí mật" (khách phải săn mới có): chặn dò mã bằng cách thử liên tục. */
    static final int MAX_WRONG_CODES = 8;
    private static final long WRONG_WINDOW_MS = 15 * 60 * 1000L;
    private final Map<Long, Deque<Long>> wrongCodes = new java.util.concurrent.ConcurrentHashMap<>();

    private final VoucherRepository voucherRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Value("${app.order.free-shipping-from}")
    private BigDecimal freeShippingFrom;
    @Value("${app.order.shipping-fee}")
    private BigDecimal shippingFee;

    // ================================================================ TÍNH GIẢM GIÁ

    /**
     * Kiểm tra mã có dùng được cho đơn này không; được thì trả về số tiền giảm, không thì ném lỗi kèm lý do dễ hiểu.
     * userId = null: bỏ qua giới hạn mỗi khách (dùng khi xem trước cho khách chưa đăng nhập).
     */
    public BigDecimal discountFor(Voucher v, BigDecimal subtotal, Long userId) {
        String reason = whyNotUsable(v, subtotal, userId);
        if (reason != null) throw ApiException.badRequest(reason);
        BigDecimal discount = v.getDiscountType() == DiscountType.PERCENT
                ? subtotal.multiply(v.getDiscountValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN)
                : v.getDiscountValue();
        if (v.getMaxDiscount() != null) discount = discount.min(v.getMaxDiscount());
        return discount.min(subtotal).setScale(0, RoundingMode.DOWN);
    }

    /** null = dùng được; ngược lại là lý do. */
    private String whyNotUsable(Voucher v, BigDecimal subtotal, Long userId) {
        LocalDateTime now = LocalDateTime.now();
        if (!v.isActive()) return "Mã " + v.getCode() + " đã ngừng áp dụng";
        if (v.getStartsAt() != null && v.getStartsAt().isAfter(now)) {
            return "Mã " + v.getCode() + " áp dụng từ " + v.getStartsAt().format(DT);
        }
        if (v.getEndsAt() != null && !v.getEndsAt().isAfter(now)) return "Mã " + v.getCode() + " đã hết hạn";
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) return "Mã " + v.getCode() + " đã hết lượt sử dụng";
        if (subtotal.compareTo(v.getMinOrder()) < 0) {
            return "Đơn từ " + vnd(v.getMinOrder()) + " mới dùng được mã này (mua thêm " + vnd(v.getMinOrder().subtract(subtotal)) + ")";
        }
        if (userId != null) {
            long used = orderRepository.countByUserIdAndVoucherIdAndStatusNot(userId, v.getId(), OrderStatus.CANCELLED);
            if (used >= v.getPerUserLimit()) {
                return v.getPerUserLimit() == 1 ? "Bạn đã dùng mã " + v.getCode() + " rồi"
                        : "Bạn đã dùng hết " + v.getPerUserLimit() + " lần của mã " + v.getCode();
            }
        }
        return null;
    }

    /** Lúc đặt hàng: khoá voucher, kiểm tra, cộng 1 lượt dùng. */
    @Transactional
    public Applied applyForOrder(String code, BigDecimal subtotal, Long userId) {
        checkGuessing(userId);
        Voucher v = voucherRepository.findByCodeForUpdate(code.trim())
                .orElseThrow(() -> wrongCode(userId, code));
        BigDecimal discount = discountFor(v, subtotal, userId);
        v.setUsedCount(v.getUsedCount() + 1);
        log.info("Dùng mã {} cho user #{}: giảm {}", v.getCode(), userId, discount);
        return new Applied(v, discount);
    }

    public record Applied(Voucher voucher, BigDecimal discount) {
    }

    /** Đơn bị huỷ: trả lại lượt dùng. */
    @Transactional
    public void release(Long voucherId) {
        if (voucherId == null) return;
        voucherRepository.findByIdForUpdate(voucherId).ifPresent(v -> v.setUsedCount(Math.max(0, v.getUsedCount() - 1)));
    }

    // ================================================================ PHÍA KHÁCH

    /** Xem trước ở trang thanh toán: giá lấy từ DB, không tin giá trình duyệt gửi lên. */
    @Transactional(readOnly = true)
    public VoucherQuote quote(Long userId, QuoteRequest req) {
        checkGuessing(userId);
        BigDecimal subtotal = subtotalOf(req.items());
        Voucher v = voucherRepository.findByCodeIgnoreCase(req.code().trim())
                .orElseThrow(() -> wrongCode(userId, req.code()));
        BigDecimal discount = discountFor(v, subtotal, userId);
        BigDecimal fee = subtotal.compareTo(freeShippingFrom) >= 0 ? BigDecimal.ZERO : shippingFee;
        return new VoucherQuote(v.getCode(), v.getDescription(), subtotal, discount, fee, subtotal.subtract(discount).add(fee));
    }

    /** Đã nhập sai quá nhiều mã không tồn tại trong 15 phút -> tạm khoá ô nhập mã. */
    private void checkGuessing(Long userId) {
        Deque<Long> q = userId == null ? null : wrongCodes.get(userId);
        if (q == null) return;
        long now = System.currentTimeMillis();
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > WRONG_WINDOW_MS) q.pollFirst();
            if (q.size() >= MAX_WRONG_CODES) {
                throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                        "Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau 15 phút.");
            }
        }
    }

    private ApiException wrongCode(Long userId, String code) {
        if (userId != null) {
            Deque<Long> q = wrongCodes.computeIfAbsent(userId, k -> new ArrayDeque<>());
            synchronized (q) {
                q.addLast(System.currentTimeMillis());
            }
            if (wrongCodes.size() > 10_000) wrongCodes.clear();
        }
        return ApiException.badRequest("Mã giảm giá " + code.trim().toUpperCase() + " không tồn tại");
    }

    private BigDecimal subtotalOf(List<CheckoutRequest.Item> items) {
        Map<Long, Integer> qty = new HashMap<>();
        items.forEach(i -> qty.merge(i.productId(), i.quantity(), Integer::sum));
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Product p : productRepository.findAllById(qty.keySet())) {
            if (p.getStatus() != ProductStatus.ACTIVE) continue;
            subtotal = subtotal.add(p.getEffectivePrice().multiply(BigDecimal.valueOf(qty.get(p.getId()))));
        }
        return subtotal;
    }

    // ================================================================ PHÍA ADMIN

    @Transactional(readOnly = true)
    public List<AdminVoucherResponse> list() {
        return voucherRepository.findAllByOrderByCreatedAtDescIdDesc().stream().map(this::toAdmin).toList();
    }

    @Transactional
    public AdminVoucherResponse create(VoucherRequest req) {
        String code = req.code().trim().toUpperCase(Locale.ROOT);
        if (voucherRepository.existsByCodeIgnoreCase(code)) throw ApiException.conflict("Mã " + code + " đã tồn tại");
        Voucher v = new Voucher();
        apply(v, req, code);
        voucherRepository.save(v);
        log.info("Admin tạo mã giảm giá {}", code);
        return toAdmin(v);
    }

    @Transactional
    public AdminVoucherResponse update(Long id, VoucherRequest req) {
        Voucher v = voucherRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy mã giảm giá"));
        String code = req.code().trim().toUpperCase(Locale.ROOT);
        if (voucherRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) throw ApiException.conflict("Mã " + code + " đã tồn tại");
        apply(v, req, code);
        return toAdmin(v);
    }

    @Transactional
    public AdminVoucherResponse setActive(Long id, boolean active) {
        Voucher v = voucherRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy mã giảm giá"));
        v.setActive(active);
        return toAdmin(v);
    }

    /** Mã đã từng được dùng trong đơn thì không xoá (đơn cũ cần biết đã dùng mã gì), chỉ cho tắt. */
    @Transactional
    public void delete(Long id) {
        Voucher v = voucherRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy mã giảm giá"));
        long orders = orderRepository.countByVoucherId(id);
        if (orders > 0) {
            throw ApiException.conflict("Mã " + v.getCode() + " đã được dùng trong " + orders + " đơn hàng nên không xoá được. Hãy tắt mã thay vì xoá.");
        }
        voucherRepository.delete(v);
    }

    private void apply(Voucher v, VoucherRequest req, String code) {
        if (req.discountType() == DiscountType.PERCENT && req.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw ApiException.badRequest("Giảm theo % tối đa 100%");
        }
        if (req.startsAt() != null && req.endsAt() != null && !req.endsAt().isAfter(req.startsAt())) {
            throw ApiException.badRequest("Ngày kết thúc phải sau ngày bắt đầu");
        }
        v.setCode(code);
        v.setDescription(req.description() == null || req.description().isBlank() ? autoDescription(req) : req.description().trim());
        v.setDiscountType(req.discountType());
        v.setDiscountValue(req.discountValue());
        v.setMaxDiscount(req.discountType() == DiscountType.PERCENT ? req.maxDiscount() : null);
        v.setMinOrder(req.minOrder() == null ? BigDecimal.ZERO : req.minOrder());
        v.setStartsAt(req.startsAt());
        v.setEndsAt(req.endsAt());
        v.setUsageLimit(req.usageLimit());
        v.setPerUserLimit(req.perUserLimit() == null ? 1 : req.perUserLimit());
        v.setShowPublic(req.showPublic() == null || req.showPublic());
        v.setActive(req.active() == null || req.active());
    }

    /** Admin để trống mô tả -> tự viết, vd. "Giảm 10% (tối đa 100.000 ₫) cho đơn từ 500.000 ₫". */
    private static String autoDescription(VoucherRequest r) {
        String s = r.discountType() == DiscountType.PERCENT
                ? "Giảm " + r.discountValue().stripTrailingZeros().toPlainString() + "%"
                + (r.maxDiscount() != null ? " (tối đa " + vnd(r.maxDiscount()) + ")" : "")
                : "Giảm " + vnd(r.discountValue());
        if (r.minOrder() != null && r.minOrder().signum() > 0) s += " cho đơn từ " + vnd(r.minOrder());
        return s;
    }

    private AdminVoucherResponse toAdmin(Voucher v) {
        LocalDateTime now = LocalDateTime.now();
        String state;
        String label;
        if (!v.isActive()) { state = "OFF"; label = "Đã tắt"; }
        else if (v.getStartsAt() != null && v.getStartsAt().isAfter(now)) { state = "SCHEDULED"; label = "Chưa bắt đầu"; }
        else if (v.getEndsAt() != null && !v.getEndsAt().isAfter(now)) { state = "EXPIRED"; label = "Hết hạn"; }
        else if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) { state = "USED_UP"; label = "Hết lượt"; }
        else { state = "RUNNING"; label = "Đang chạy"; }
        return AdminVoucherResponse.from(v, state, label);
    }

    private static String vnd(BigDecimal amount) {
        return new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(Locale.forLanguageTag("vi-VN"))).format(amount) + " ₫";
    }
}
