package com.secureshop.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Thông số kỹ thuật dạng key-value.
 * specKey cố định để code/AI xử lý (resolution_mp, ip_rating...), specLabel + specValue để hiển thị.
 */
@Entity
@Table(name = "product_specs")
@Getter
@Setter
@NoArgsConstructor
public class ProductSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 50)
    private String specKey;

    @Column(nullable = false, length = 100)
    private String specLabel;

    @Column(nullable = false)
    private String specValue;

    @Column(nullable = false)
    private int sortOrder = 0;
}
