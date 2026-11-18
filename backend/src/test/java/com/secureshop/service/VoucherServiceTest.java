package com.secureshop.service;

import com.secureshop.entity.Voucher;
import com.secureshop.entity.enums.DiscountType;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.OrderRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.VoucherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Kiểm thử cách tính tiền giảm và các điều kiện của mã giảm giá. */
class VoucherServiceTest {

    VoucherRepository vouchers;
    OrderRepository orders;
    VoucherService service;

    @BeforeEach
    void setUp() {
        vouchers = mock(VoucherRepository.class);
        orders = mock(OrderRepository.class);
        service = new VoucherService(vouchers, orders, mock(ProductRepository.class));
        ReflectionTestUtils.setField(service, "freeShippingFrom", BigDecimal.valueOf(2_000_000));
        ReflectionTestUtils.setField(service, "shippingFee", BigDecimal.valueOf(30_000));
    }

    private static BigDecimal vnd(long v) {
        return BigDecimal.valueOf(v);
    }

    private Voucher voucher(DiscountType type, long value) {
        Voucher v = new Voucher();
        v.setId(1L);
        v.setCode("TEST");
        v.setDiscountType(type);
        v.setDiscountValue(vnd(value));
        v.setMinOrder(BigDecimal.ZERO);
        v.setPerUserLimit(1);
        v.setActive(true);
        return v;
    }

    @Test
    @DisplayName("Giảm 10% đơn 1.250.000 -> 125.000")
    void percent() {
        assertThat(service.discountFor(voucher(DiscountType.PERCENT, 10), vnd(1_250_000), null)).isEqualByComparingTo("125000");
    }

    @Test
    @DisplayName("Giảm 10% tối đa 100.000: đơn 3 triệu chỉ giảm 100.000")
    void percentCapped() {
        Voucher v = voucher(DiscountType.PERCENT, 10);
        v.setMaxDiscount(vnd(100_000));
        assertThat(service.discountFor(v, vnd(3_000_000), null)).isEqualByComparingTo("100000");
    }

    @Test
    @DisplayName("% lẻ được làm tròn XUỐNG tới đồng (không giảm quá)")
    void percentRoundsDown() {
        assertThat(service.discountFor(voucher(DiscountType.PERCENT, 7), vnd(333_333), null)).isEqualByComparingTo("23333");
    }

    @Test
    @DisplayName("Giảm tiền cố định lớn hơn tiền hàng -> chỉ giảm bằng tiền hàng (không âm)")
    void fixedNeverExceedsSubtotal() {
        assertThat(service.discountFor(voucher(DiscountType.FIXED, 500_000), vnd(220_000), null)).isEqualByComparingTo("220000");
    }

    @Test
    @DisplayName("Chưa đủ đơn tối thiểu -> báo cần mua thêm bao nhiêu")
    void minOrder() {
        Voucher v = voucher(DiscountType.FIXED, 50_000);
        v.setMinOrder(vnd(1_000_000));
        assertThatThrownBy(() -> service.discountFor(v, vnd(800_000), null))
                .isInstanceOf(ApiException.class).hasMessageContaining("mua thêm 200.000");
        assertThat(service.discountFor(v, vnd(1_000_000), null)).isEqualByComparingTo("50000"); // đúng bằng mức tối thiểu: được
    }

    @Test
    @DisplayName("Mã đã tắt / hết hạn / chưa bắt đầu / hết lượt -> từ chối với lý do riêng")
    void unusableStates() {
        Voucher off = voucher(DiscountType.FIXED, 1000);
        off.setActive(false);
        assertThatThrownBy(() -> service.discountFor(off, vnd(1_000_000), null)).hasMessageContaining("ngừng áp dụng");

        Voucher expired = voucher(DiscountType.FIXED, 1000);
        expired.setEndsAt(LocalDateTime.now().minusMinutes(1));
        assertThatThrownBy(() -> service.discountFor(expired, vnd(1_000_000), null)).hasMessageContaining("hết hạn");

        Voucher later = voucher(DiscountType.FIXED, 1000);
        later.setStartsAt(LocalDateTime.now().plusDays(1));
        assertThatThrownBy(() -> service.discountFor(later, vnd(1_000_000), null)).hasMessageContaining("áp dụng từ");

        Voucher usedUp = voucher(DiscountType.FIXED, 1000);
        usedUp.setUsageLimit(5);
        usedUp.setUsedCount(5);
        assertThatThrownBy(() -> service.discountFor(usedUp, vnd(1_000_000), null)).hasMessageContaining("hết lượt");
    }

    @Test
    @DisplayName("Mỗi khách dùng 1 lần: đã có đơn (chưa huỷ) dùng mã -> từ chối")
    void perUserLimit() {
        Voucher v = voucher(DiscountType.FIXED, 50_000);
        when(orders.countByUserIdAndVoucherIdAndStatusNot(7L, 1L, OrderStatus.CANCELLED)).thenReturn(1L);
        assertThatThrownBy(() -> service.discountFor(v, vnd(1_000_000), 7L)).hasMessageContaining("đã dùng mã");
        when(orders.countByUserIdAndVoucherIdAndStatusNot(8L, 1L, OrderStatus.CANCELLED)).thenReturn(0L);
        assertThat(service.discountFor(v, vnd(1_000_000), 8L)).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("Đặt hàng: khoá mã + cộng 1 lượt; huỷ đơn: trả lại 1 lượt (không âm)")
    void applyAndRelease() {
        Voucher v = voucher(DiscountType.FIXED, 50_000);
        v.setUsedCount(3);
        when(vouchers.findByCodeForUpdate("test")).thenReturn(Optional.of(v));
        when(vouchers.findByIdForUpdate(1L)).thenReturn(Optional.of(v));

        VoucherService.Applied a = service.applyForOrder(" test ", vnd(1_000_000), 9L);
        assertThat(a.discount()).isEqualByComparingTo("50000");
        assertThat(v.getUsedCount()).isEqualTo(4);

        service.release(1L);
        assertThat(v.getUsedCount()).isEqualTo(3);
        v.setUsedCount(0);
        service.release(1L);
        assertThat(v.getUsedCount()).isZero();
    }

    @Test
    @DisplayName("Mã không tồn tại -> báo lỗi, không cộng lượt")
    void unknownCode() {
        when(vouchers.findByCodeForUpdate(anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.applyForOrder("KHONGCO", vnd(1_000_000), 1L))
                .isInstanceOf(ApiException.class).hasMessageContaining("không tồn tại");
    }
}
