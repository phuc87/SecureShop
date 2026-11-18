package com.secureshop.repository;

import com.secureshop.entity.AiChatLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AiChatLogRepository extends JpaRepository<AiChatLog, Long>, JpaSpecificationExecutor<AiChatLog> {

    /** Các lượt gần đây của cùng phiên chat -> ghép ngữ cảnh ("ngoài trời" ở câu sau bổ sung cho "camera" ở câu trước). */
    List<AiChatLog> findTop6BySessionIdAndCreatedAtAfterOrderByIdDesc(String sessionId, LocalDateTime after);

    List<AiChatLog> findTop12BySessionIdOrderByIdDesc(String sessionId);

    long countByCreatedAtAfter(LocalDateTime after);

    long countByFeedback(String feedback);

    long countByHandedOffTrue();

    long countByConfidenceLessThan(java.math.BigDecimal value);

    long countByCorrectedIntentIsNotNull();

    @Query("SELECT AVG(l.confidence) FROM AiChatLog l WHERE l.confidence IS NOT NULL")
    Double averageConfidence();

    /** [intent, số lượt] theo intent model dự đoán. */
    @Query("SELECT l.predictedIntent, COUNT(l) FROM AiChatLog l WHERE l.predictedIntent IS NOT NULL GROUP BY l.predictedIntent ORDER BY COUNT(l) DESC")
    List<Object[]> countByIntent();

    /** Câu đã có nhãn đúng: admin sửa nhãn, hoặc khách bấm 👍 (xác nhận AI hiểu đúng). */
    @Query("""
            SELECT l FROM AiChatLog l
            WHERE l.correctedIntent IS NOT NULL OR (l.feedback = 'GOOD' AND l.predictedIntent IS NOT NULL)
            ORDER BY l.id
            """)
    List<AiChatLog> findLabeled();

    @Query("SELECT l FROM AiChatLog l WHERE l.id = :id AND (l.sessionId = :sessionId OR (:userId IS NOT NULL AND l.userId = :userId))")
    java.util.Optional<AiChatLog> findOwned(@Param("id") Long id, @Param("sessionId") String sessionId, @Param("userId") Long userId);
}
