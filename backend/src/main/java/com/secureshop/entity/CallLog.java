package com.secureshop.entity;

import com.secureshop.entity.enums.CallStatus;
import com.secureshop.entity.enums.CallType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Nhật ký cuộc gọi video giữa khách và tư vấn viên (bảng call_logs, tạo ở V1). */
@Entity
@Table(name = "call_logs")
@Getter
@Setter
@NoArgsConstructor
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caller_id")
    private User caller;

    /** Người bắt máy (khi khách gọi, chỉ biết sau khi 1 tư vấn viên nhận). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "callee_id")
    private User callee;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false, length = 10)
    private CallType callType = CallType.VIDEO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CallStatus status = CallStatus.RINGING;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime answeredAt;

    private LocalDateTime endedAt;

    @Column(nullable = false)
    private int durationSeconds = 0;
}
