package com.secureshop.dto.product;

import com.secureshop.entity.enums.Placement;
import com.secureshop.entity.enums.ProductStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/** Dữ liệu form thêm / sửa sản phẩm của admin. */
public record AdminProductRequest(
        @NotBlank(message = "Vui lòng nhập tên sản phẩm") @Size(max = 255, message = "Tên tối đa 255 ký tự") String name,

        @NotBlank(message = "Vui lòng nhập mã SKU") @Size(max = 50, message = "SKU tối đa 50 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9._/-]+$", message = "SKU chỉ gồm chữ không dấu, số và các ký tự . _ / -")
        String sku,

        /** Để trống thì tự tạo từ tên sản phẩm. */
        @Size(max = 280) @Pattern(regexp = "^([a-z0-9]+(-[a-z0-9]+)*)?$", message = "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu -")
        String slug,

        @NotNull(message = "Vui lòng chọn danh mục") Long categoryId,
        Long brandId,

        @Size(max = 500, message = "Mô tả ngắn tối đa 500 ký tự") String shortDescription,
        @Size(max = 20000, message = "Mô tả tối đa 20.000 ký tự") String description,

        @NotNull(message = "Vui lòng nhập giá bán")
        @DecimalMin(value = "0", message = "Giá không được âm") @Digits(integer = 13, fraction = 0, message = "Giá không hợp lệ")
        BigDecimal price,

        @DecimalMin(value = "0", message = "Giá khuyến mãi không được âm") @Digits(integer = 13, fraction = 0, message = "Giá không hợp lệ")
        BigDecimal salePrice,

        @NotNull(message = "Vui lòng nhập tồn kho") @Min(value = 0, message = "Tồn kho không được âm")
        @Max(value = 1_000_000, message = "Tồn kho quá lớn") Integer stock,

        @NotNull @Min(value = 0, message = "Bảo hành không được âm") @Max(value = 120, message = "Bảo hành tối đa 120 tháng")
        Integer warrantyMonths,

        Placement placement,
        @NotNull ProductStatus status,
        boolean featured,

        /** Đường dẫn ảnh (lấy từ API upload), ảnh đầu tiên là ảnh đại diện. */
        @Size(max = 10, message = "Tối đa 10 ảnh") List<@NotBlank @Size(max = 500) String> images,

        @Size(max = 30, message = "Tối đa 30 thông số") List<@Valid Spec> specs
) {
    public record Spec(
            @NotBlank(message = "Thiếu mã thông số") @Size(max = 50)
            @Pattern(regexp = "^[a-z0-9_]+$", message = "Mã thông số chỉ gồm chữ thường không dấu, số và _")
            String key,
            @NotBlank(message = "Thiếu tên thông số") @Size(max = 100) String label,
            @NotBlank(message = "Thiếu giá trị thông số") @Size(max = 255) String value
    ) {
    }
}
