package com.secureshop.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Địa chỉ nhận hàng đã lưu của khách (địa chỉ mặc định được điền sẵn ở trang thanh toán). */
@Entity
@Table(name = "addresses")
@Getter
@Setter
@NoArgsConstructor
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String receiverName;

    @Column(nullable = false, length = 20)
    private String receiverPhone;

    @Column(nullable = false, length = 100)
    private String province;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String ward;

    @Column(nullable = false)
    private String street;

    @Column(name = "is_default", nullable = false)
    private boolean defaultAddress = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh" (bỏ qua phần để trống, vd. không có Quận/Huyện) */
    public String fullAddress() {
        return join(street, ward, district, province);
    }

    public static String join(String... parts) {
        return java.util.Arrays.stream(parts).filter(p -> p != null && !p.isBlank()).map(String::trim)
                .collect(java.util.stream.Collectors.joining(", "));
    }
}
