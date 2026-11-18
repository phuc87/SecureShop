package com.secureshop.dto.voucher;

import com.secureshop.dto.order.CheckoutRequest;
import com.secureshop.entity.Voucher;
import com.secureshop.entity.enums.DiscountType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Các DTO của mã giảm giá. */
public final class VoucherDtos {

    private VoucherDtos() {
    }

    /** Admin thêm / sửa mã. */
    public record VoucherRequest(
            @NotBlank(message = "Vui lòng nhập mã")
            @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "Mã gồm 3-30 ký tự: chữ không dấu, số, gạch ngang") String code,
            @Size(max = 255, message = "Mô tả tối đa 255 ký tự") String description,
            @NotNull(message = "Chọn kiểu giảm") DiscountType discountType,
            @NotNull(message = "Nhập mức giảm") @DecimalMin(value = "1", message = "Mức giảm phải lớn hơn 0") BigDecimal discountValue,
            @DecimalMin(value = "1", message = "Giảm tối đa phải lớn hơn 0") BigDecimal maxDiscount,
            @DecimalMin(value = "0", message = "Đơn tối thiểu không âm") BigDecimal minOrder,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            @Min(value = 1, message = "Tổng lượt dùng tối thiểu là 1") Integer usageLimit,
            @Min(value = 1, message = "Mỗi khách dùng tối thiểu 1 lần") @Max(value = 100, message = "Mỗi khách tối đa 100 lần") Integer perUserLimit,
            Boolean showPublic,
            Boolean active) {
    }

    /** Danh sách mã cho admin, kèm trạng thái dễ đọc. */
    public record AdminVoucherResponse(Long id, String code, String description, DiscountType discountType,
                                       BigDecimal discountValue, BigDecimal maxDiscount, BigDecimal minOrder,
                                       LocalDateTime startsAt, LocalDateTime endsAt, Integer usageLimit, int usedCount,
                                       int perUserLimit, boolean showPublic, boolean active, String state,
                                       String stateLabel, LocalDateTime createdAt) {
        public static AdminVoucherResponse from(Voucher v, String state, String stateLabel) {
            return new AdminVoucherResponse(v.getId(), v.getCode(), v.getDescription(), v.getDiscountType(),
                    v.getDiscountValue(), v.getMaxDiscount(), v.getMinOrder(), v.getStartsAt(), v.getEndsAt(),
                    v.getUsageLimit(), v.getUsedCount(), v.getPerUserLimit(), v.isShowPublic(), v.isActive(),
                    state, stateLabel, v.getCreatedAt());
        }
    }

    /** Khách hỏi "mã này giảm bao nhiêu cho giỏ hàng của tôi?" (tiền hàng tính lại từ giá trong DB). */
    public record QuoteRequest(@NotBlank(message = "Vui lòng nhập mã giảm giá") @Size(max = 30) String code,
                               @NotEmpty(message = "Giỏ hàng trống") @Valid List<CheckoutRequest.Item> items) {
    }

    public record VoucherQuote(String code, String description, BigDecimal subtotal, BigDecimal discount,
                               BigDecimal shippingFee, BigDecimal total) {
    }
}
