package com.secureshop.repository;

import com.secureshop.entity.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    /** Danh sách yêu thích của khách, kèm sẵn sản phẩm + danh mục + thương hiệu (tránh N+1). */
    @EntityGraph(attributePaths = {"product", "product.category", "product.brand"})
    List<Favorite> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    /** Chỉ lấy id sản phẩm: để tô đỏ trái tim trên mọi thẻ sản phẩm. */
    @Query("SELECT f.product.id FROM Favorite f WHERE f.user.id = :userId")
    List<Long> productIdsOf(@Param("userId") Long userId);

    boolean existsByUserIdAndProductId(Long userId, Long productId);

    long countByUserId(Long userId);

    /**
     * Thêm nếu chưa có; đã có thì bỏ qua (khoá uk_favorite_once). 1 câu SQL nên bấm liên tục / nhiều tab
     * cùng lúc cũng không lỗi. Trả về 1 nếu vừa thêm, 0 nếu đã có sẵn.
     */
    @Modifying
    @Query(value = "INSERT IGNORE INTO favorites (user_id, product_id, created_at) VALUES (:userId, :productId, NOW())",
            nativeQuery = true)
    int insertIgnore(@Param("userId") Long userId, @Param("productId") Long productId);

    @Modifying
    @Query("DELETE FROM Favorite f WHERE f.user.id = :userId AND f.product.id = :productId")
    int deleteOne(@Param("userId") Long userId, @Param("productId") Long productId);
}
