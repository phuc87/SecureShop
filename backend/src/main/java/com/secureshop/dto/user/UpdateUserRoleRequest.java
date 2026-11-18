package com.secureshop.dto.user;

import com.secureshop.entity.enums.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull(message = "Thiếu vai trò") Role role) {
}
