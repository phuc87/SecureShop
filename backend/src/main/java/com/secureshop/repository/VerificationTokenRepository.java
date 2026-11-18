package com.secureshop.repository;

import com.secureshop.entity.VerificationToken;
import com.secureshop.entity.enums.TokenType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    @EntityGraph(attributePaths = {"user"})
    Optional<VerificationToken> findByTokenAndType(String tokenHash, TokenType type);

    long countByUserIdAndTypeAndCreatedAtAfter(Long userId, TokenType type, LocalDateTime after);

    /** Huỷ các mã cũ chưa dùng (chỉ link mới nhất có hiệu lực). */
    @Modifying
    @Query("UPDATE VerificationToken t SET t.usedAt = :now WHERE t.user.id = :uid AND t.type = :type AND t.usedAt IS NULL")
    int invalidateAll(@Param("uid") Long userId, @Param("type") TokenType type, @Param("now") LocalDateTime now);
}
