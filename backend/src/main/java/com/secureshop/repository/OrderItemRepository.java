package com.secureshop.repository;

import com.secureshop.entity.OrderItem;
import com.secureshop.entity.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** Sản phẩm đã từng nằm trong đơn nào chưa (có thì không cho xoá, chỉ cho ẩn). */
    boolean existsByProductId(Long productId);

    /** [orderId, orderCode] các đơn của khách có chứa sản phẩm và đang ở trạng thái cho trước, mới nhất trước. */
    @Query("""
            SELECT DISTINCT o.id, o.orderCode, o.createdAt FROM OrderItem oi JOIN oi.order o
            WHERE o.user.id = :userId AND oi.product.id = :productId AND o.status = :status
            ORDER BY o.createdAt DESC
            """)
    List<Object[]> ordersContaining(@Param("userId") Long userId, @Param("productId") Long productId,
                                    @Param("status") OrderStatus status);

    /** Khách đã từng đặt (bất kỳ trạng thái nào) sản phẩm này chưa. */
    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.order.user.id = :userId AND oi.product.id = :productId")
    boolean hasOrdered(@Param("userId") Long userId, @Param("productId") Long productId);
}
