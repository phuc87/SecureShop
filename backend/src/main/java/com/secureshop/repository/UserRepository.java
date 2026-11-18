package com.secureshop.repository;

import com.secureshop.entity.User;
import com.secureshop.entity.enums.Role;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Tìm theo tên/email/sđt và lọc theo vai trò; tham số null = bỏ qua điều kiện đó. */
    @Query("""
            SELECT u FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:keyword IS NULL
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR u.phone LIKE CONCAT('%', :keyword, '%'))
            """)
    List<User> search(@Param("keyword") String keyword, @Param("role") Role role, Sort sort);
}
