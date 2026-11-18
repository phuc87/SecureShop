package com.secureshop.entity;

import com.secureshop.entity.enums.EmailStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Nhật ký mỗi email hệ thống gửi đi (thành công hay lỗi), hiển thị trong trang chi tiết đơn của admin. */
@Entity
@Table(name = "email_logs")
@Getter
@Setter
@NoArgsConstructor
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String toEmail;

    @Column(nullable = false)
    private String subject;

    /** Tên template: order-confirmation, new-order-admin, order-status-changed, test-email */
    @Column(nullable = false, length = 50)
    private String template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_order_id")
    private Order relatedOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailStatus status = EmailStatus.PENDING;

    @Column(length = 1000)
    private String errorMessage;

    @Column(nullable = false)
    private int retryCount = 0;

    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
