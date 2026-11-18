package com.secureshop.dto.catalog;

import jakarta.validation.constraints.*;

/** Admin thêm/sửa danh mục. slug để trống thì tự tạo từ tên. */
public record CategoryRequest(
        @NotBlank(message = "Vui lòng nhập tên danh mục")
        @Size(max = 100, message = "Tên tối đa 100 ký tự") String name,
        @Size(max = 120, message = "Slug tối đa 120 ký tự")
        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang") String slug,
        @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description,
        @Size(max = 500, message = "Link ảnh tối đa 500 ký tự") String imageUrl,
        @Min(value = 0, message = "Thứ tự phải từ 0 trở lên") @Max(value = 9999, message = "Thứ tự tối đa 9999") Integer sortOrder) {
}
