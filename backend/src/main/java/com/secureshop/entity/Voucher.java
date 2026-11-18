package com.secureshop.entity;

import com.secureshop.entity.enums.DiscountType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Mã giảm giá (bảng vouchers, file V7__vouchers.sql). */
@Entity
@Table(name = "vouchers")
@Getter
@Setter
@NoArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DiscountType discountType;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal discountValue;

    @Column(precision = 15, scale = 2)
    private BigDecimal maxDiscount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal minOrder = BigDecimal.ZERO;

    private LocalDateTime startsAt;

    private LocalDateTime endsAt;

    private Integer usageLimit;

    @Column(nullable = false)
    private int usedCount = 0;

    @Column(nullable = false)
    private int perUserLimit = 1;

    @Column(nullable = false)
    private boolean showPublic = true;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
