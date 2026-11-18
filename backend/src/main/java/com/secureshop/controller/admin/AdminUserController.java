package com.secureshop.controller.admin;

import com.secureshop.dto.user.UpdateUserRoleRequest;
import com.secureshop.dto.user.UpdateUserStatusRequest;
import com.secureshop.dto.user.UserResponse;
import com.secureshop.entity.enums.Role;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Quản lý người dùng, chỉ ADMIN.
 * Chặn 2 lớp: URL /api/admin/** trong SecurityConfig + @PreAuthorize ở đây
 * (lỡ ai đổi URL hoặc cấu hình thì lớp còn lại vẫn chặn).
 */
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** GET /api/admin/users?q=an&role=CUSTOMER */
    @GetMapping
    public List<UserResponse> list(@RequestParam(required = false) String q,
                                   @RequestParam(required = false) Role role) {
        return adminUserService.search(q, role);
    }

    /** PATCH /api/admin/users/3/status  body: {"enabled": false} */
    @PatchMapping("/{id}/status")
    public UserResponse updateStatus(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                     @Valid @RequestBody UpdateUserStatusRequest request) {
        return adminUserService.updateStatus(me.id(), id, request.enabled());
    }

    /** PATCH /api/admin/users/3/role  body: {"role": "ADMIN"} */
    @PatchMapping("/{id}/role")
    public UserResponse updateRole(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                   @Valid @RequestBody UpdateUserRoleRequest request) {
        return adminUserService.updateRole(me.id(), id, request.role());
    }
}
