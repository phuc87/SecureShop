package com.secureshop.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 1 lượt hỏi - đáp với trợ lý AI (bảng ai_chat_logs, tạo ở V1).
 * Dùng để: nhớ ngữ cảnh hội thoại, thống kê, và làm DỮ LIỆU TRAIN (admin sửa nhãn ở corrected_intent).
 */
@Entity
@Table(name = "ai_chat_logs")
@Getter
@Setter
@NoArgsConstructor
public class AiChatLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id")
    private Long conversationId;

    /** NULL với khách vãng lai. */
    @Column(name = "user_id")
    private Long userId;

    /** Mã phiên do trình duyệt tạo (khách vãng lai và đã đăng nhập đều có). */
    @Column(length = 64)
    private String sessionId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String userMessage;

    /** Intent model dự đoán (thô, chưa qua luật bổ sung). */
    @Column(length = 50)
    private String predictedIntent;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    /** JSON: thông tin trích xuất + "_intent" (intent cuối cùng backend dùng để trả lời). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "longtext") // MariaDB lưu JSON dưới dạng LONGTEXT
    private com.fasterxml.jackson.databind.JsonNode entities;

    @Column(columnDefinition = "TEXT")
    private String botReply;

    /** JSON: [3, 7, 12] */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "longtext") // MariaDB lưu JSON dưới dạng LONGTEXT
    private java.util.List<Long> suggestedProductIds;

    @Column(nullable = false)
    private boolean handedOff = false;

    /** GOOD | BAD (khách bấm 👍 / 👎) */
    @Column(length = 10)
    private String feedback;

    /** Nhãn đúng do admin gán lại -> đưa vào train khi bấm "Dạy lại AI". */
    @Column(length = 50)
    private String correctedIntent;

    @Column(length = 30)
    private String modelVersion;

    private Integer responseMs;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
