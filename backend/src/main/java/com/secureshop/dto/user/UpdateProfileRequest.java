package com.secureshop.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 100, message = "Họ tên tối đa 100 ký tự") String fullName,
        @Pattern(regexp = "^(0\\d{9})?$", message = "Số điện thoại gồm 10 số, bắt đầu bằng 0") String phone
) {
}
