package com.secureshop.dto.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Admin thêm/sửa thương hiệu. slug để trống thì tự tạo từ tên. */
public record BrandRequest(
        @NotBlank(message = "Vui lòng nhập tên thương hiệu")
        @Size(max = 100, message = "Tên tối đa 100 ký tự") String name,
        @Size(max = 120, message = "Slug tối đa 120 ký tự")
        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang") String slug,
        @Size(max = 500, message = "Link logo tối đa 500 ký tự") String logoUrl,
        @Size(max = 60, message = "Quốc gia tối đa 60 ký tự") String country) {
}
