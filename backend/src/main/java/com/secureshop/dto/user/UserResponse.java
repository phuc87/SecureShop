package com.secureshop.dto.user;

import com.secureshop.entity.User;
import com.secureshop.entity.enums.Role;

import java.time.LocalDateTime;

/** Thông tin người dùng trả về client. Không bao giờ chứa passwordHash. */
public record UserResponse(Long id, String fullName, String email, String phone, String avatarUrl,
                           Role role, boolean emailVerified, boolean enabled, LocalDateTime createdAt) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAvatarUrl(),
                u.getRole(), u.isEmailVerified(), u.isEnabled(), u.getCreatedAt());
    }
}
