package com.secureshop.repository;

import com.secureshop.entity.Order;
import com.secureshop.entity.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** Đơn của 1 khách, mới nhất trước. */
    Page<Order> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Optional<Order> findWithUserById(Long id);

    /** Admin tìm đơn: theo trạng thái + mã đơn / tên / SĐT / email người nhận. */
    @Query("""
            SELECT o FROM Order o
            WHERE (:status IS NULL OR o.status = :status)
              AND (:keyword IS NULL
                   OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR o.receiverPhone LIKE CONCAT('%', :keyword, '%')
                   OR LOWER(o.receiverEmail) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY o.createdAt DESC, o.id DESC
            """)
    Page<Order> search(@Param("status") OrderStatus status, @Param("keyword") String keyword, Pageable pageable);

    long countByStatus(OrderStatus status);

    /** Khách đã dùng mã này bao nhiêu lần (không tính đơn đã huỷ). */
    long countByUserIdAndVoucherIdAndStatusNot(Long userId, Long voucherId, OrderStatus status);

    long countByVoucherId(Long voucherId);

    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countGroupByStatus();

    long countByCreatedAtGreaterThanEqual(LocalDateTime from);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = :status")
    BigDecimal sumTotalByStatus(@Param("status") OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = :status AND o.createdAt >= :from")
    BigDecimal sumTotalByStatusSince(@Param("status") OrderStatus status, @Param("from") LocalDateTime from);

    /** Giá trị đơn theo ngày (không tính đơn huỷ): [ngày, số đơn, tổng tiền]. */
    @Query(value = """
            SELECT DATE(created_at) AS d, COUNT(*) AS n, COALESCE(SUM(total), 0) AS s
            FROM orders
            WHERE created_at >= :from AND status <> 'CANCELLED'
            GROUP BY DATE(created_at)
            ORDER BY d
            """, nativeQuery = true)
    List<Object[]> dailyTotalsSince(@Param("from") LocalDateTime from);

    List<Order> findTop6ByOrderByCreatedAtDescIdDesc();
}
