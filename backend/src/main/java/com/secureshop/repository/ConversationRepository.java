package com.secureshop.repository;

import com.secureshop.entity.Conversation;
import com.secureshop.entity.enums.ConversationStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Hội thoại gần nhất của khách (mỗi khách dùng lại 1 hội thoại). */
    @EntityGraph(attributePaths = {"customer", "admin"})
    Optional<Conversation> findFirstByCustomerIdOrderByIdDesc(Long customerId);

    @EntityGraph(attributePaths = {"customer", "admin"})
    Optional<Conversation> findWithUsersById(Long id);

    /** Danh sách cho admin: chỉ hội thoại đã có tin nhắn, mới nhất lên đầu. */
    @EntityGraph(attributePaths = {"customer", "admin"})
    @Query("""
            SELECT c FROM Conversation c
            WHERE c.lastMessageAt IS NOT NULL
              AND (:status IS NULL OR c.status = :status)
              AND (:keyword IS NULL
                   OR LOWER(c.customer.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.customer.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY c.lastMessageAt DESC
            """)
    List<Conversation> searchForAdmin(@Param("status") ConversationStatus status, @Param("keyword") String keyword);

    @Query("SELECT COALESCE(SUM(c.unreadAdmin), 0) FROM Conversation c")
    long totalUnreadForAdmin();
}
