package com.secureshop.service;

import com.secureshop.dto.user.UserResponse;
import com.secureshop.entity.User;
import com.secureshop.entity.enums.Role;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Nghiệp vụ quản lý người dùng của ADMIN.
 * Quy tắc an toàn: admin không được tự khoá hoặc tự hạ quyền chính mình,
 * nhờ vậy hệ thống luôn còn ít nhất 1 admin hoạt động.
 * Thay đổi có hiệu lực ngay ở request tiếp theo của người bị đổi,
 * vì JwtAuthFilter tải lại user từ DB mỗi lần.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> search(String keyword, Role role) {
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return userRepository.search(kw, role, Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse updateStatus(Long actorId, Long userId, boolean enabled) {
        User user = findUser(userId);
        if (user.getId().equals(actorId)) {
            throw ApiException.badRequest("Bạn không thể tự khoá tài khoản của chính mình");
        }
        user.setEnabled(enabled);
        log.info("Admin #{} {} tài khoản #{} ({})", actorId, enabled ? "mở khoá" : "khoá", userId, user.getEmail());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateRole(Long actorId, Long userId, Role role) {
        User user = findUser(userId);
        if (user.getId().equals(actorId)) {
            throw ApiException.badRequest("Bạn không thể tự thay đổi vai trò của chính mình");
        }
        user.setRole(role);
        log.info("Admin #{} đổi vai trò tài khoản #{} ({}) thành {}", actorId, userId, user.getEmail(), role);
        return UserResponse.from(user);
    }

    private User findUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
    }
}
