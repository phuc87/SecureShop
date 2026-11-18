package com.secureshop.dto.contact;

import com.secureshop.entity.enums.ContactSubject;
import jakarta.validation.constraints.*;

public record ContactRequest(
        @NotBlank(message = "Vui lòng nhập họ tên")
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        @Size(max = 150)
        String email,

        @Pattern(regexp = "^(0\\d{9})?$", message = "Số điện thoại gồm 10 số, bắt đầu bằng 0")
        String phone,

        @NotNull(message = "Vui lòng chọn chủ đề")
        ContactSubject subject,

        @NotBlank(message = "Vui lòng nhập nội dung")
        @Size(min = 10, max = 2000, message = "Nội dung từ 10 đến 2000 ký tự")
        String message
) {
}
