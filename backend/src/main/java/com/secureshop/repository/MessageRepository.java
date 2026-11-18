package com.secureshop.repository;

import com.secureshop.entity.Message;
import com.secureshop.entity.enums.SenderType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Trang tin mới nhất (sắp xếp giảm dần, service đảo lại). */
    @EntityGraph(attributePaths = {"sender", "product"})
    List<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    /** Tin cũ hơn tin có id = beforeId (bấm "Xem tin cũ hơn"). */
    @EntityGraph(attributePaths = {"sender", "product"})
    List<Message> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long beforeId, Pageable pageable);

    /** Tin cuối cùng của từng hội thoại, để hiện dòng xem trước trong danh sách. */
    @Query("""
            SELECT m FROM Message m
            WHERE m.id IN (SELECT MAX(m2.id) FROM Message m2 WHERE m2.conversation.id IN :ids GROUP BY m2.conversation.id)
            """)
    List<Message> findLastMessages(@Param("ids") Collection<Long> conversationIds);

    /** Đánh dấu "đã xem" các tin của phía bên kia. */
    @Modifying
    @Query("""
            UPDATE Message m SET m.seenAt = :now
            WHERE m.conversation.id = :cid AND m.senderType IN :senders AND m.seenAt IS NULL
            """)
    int markSeen(@Param("cid") Long conversationId, @Param("senders") Collection<SenderType> senders,
                 @Param("now") LocalDateTime now);
}
