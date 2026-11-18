package com.secureshop.repository;

import com.secureshop.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    /** Đánh giá tốt mới nhất, kèm luôn sản phẩm và người viết (1 câu SQL). */
    @Query("""
            SELECT r FROM ProductReview r
            JOIN FETCH r.product p
            JOIN FETCH r.user u
            WHERE r.rating >= :minRating AND r.comment IS NOT NULL
            ORDER BY r.createdAt DESC
            """)
    List<ProductReview> findLatest(@Param("minRating") int minRating, Pageable pageable);

    /** Đánh giá của 1 sản phẩm, mới nhất trước. */
    @EntityGraph(attributePaths = {"user", "product"})
    Page<ProductReview> findByProductIdOrderByCreatedAtDescIdDesc(Long productId, Pageable pageable);

    /** [số sao, số lượt] của 1 sản phẩm. */
    @Query("SELECT r.rating, COUNT(r) FROM ProductReview r WHERE r.product.id = :productId GROUP BY r.rating")
    List<Object[]> countByRating(@Param("productId") Long productId);

    /** Các đơn mà khách đã dùng để đánh giá sản phẩm này. */
    @Query("SELECT r.orderId FROM ProductReview r WHERE r.user.id = :userId AND r.product.id = :productId")
    List<Long> reviewedOrderIds(@Param("userId") Long userId, @Param("productId") Long productId);

    /** Sản phẩm nào trong đơn đã được khách đánh giá (để hiện "Đã đánh giá" ở chi tiết đơn). */
    @Query("SELECT r.product.id FROM ProductReview r WHERE r.user.id = :userId AND r.orderId = :orderId")
    List<Long> reviewedProductIds(@Param("userId") Long userId, @Param("orderId") Long orderId);
}
