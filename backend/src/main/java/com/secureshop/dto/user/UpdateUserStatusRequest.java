package com.secureshop.dto.user;

import jakarta.validation.constraints.NotNull;

/** enabled = false: khoá tài khoản; true: mở khoá. */
public record UpdateUserStatusRequest(@NotNull(message = "Thiếu trạng thái") Boolean enabled) {
}
