package com.secureshop.repository;

import com.secureshop.entity.Product;
import com.secureshop.entity.enums.ProductStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    @EntityGraph(attributePaths = {"category", "brand"})
    Optional<Product> findBySlugAndStatus(String slug, ProductStatus status);

    @EntityGraph(attributePaths = {"category", "brand"})
    Optional<Product> findWithCategoryById(Long id);

    /**
     * Khoá các dòng sản phẩm (SELECT ... FOR UPDATE) trong lúc đặt hàng / huỷ đơn:
     * 2 khách cùng mua món cuối cùng thì người sau phải chờ và sẽ thấy hết hàng, tồn kho không bị âm.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id IN :ids")
    List<Product> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    long countByStatus(ProductStatus status);

    long countByCategoryId(Long categoryId);

    long countByBrandId(Long brandId);

    /** [categoryId, số sản phẩm] cho trang quản lý danh mục. */
    @Query("SELECT p.category.id, COUNT(p) FROM Product p GROUP BY p.category.id")
    List<Object[]> countGroupByCategory();

    /** [brandId, số sản phẩm] cho trang quản lý thương hiệu. */
    @Query("SELECT p.brand.id, COUNT(p) FROM Product p WHERE p.brand IS NOT NULL GROUP BY p.brand.id")
    List<Object[]> countGroupByBrand();

    /** Lấy giá/tồn kho mới nhất cho giỏ hàng (chỉ sản phẩm đang bán). */
    @EntityGraph(attributePaths = {"category", "brand"})
    List<Product> findByIdInAndStatus(Collection<Long> ids, ProductStatus status);

    /** Sản phẩm đang bán sắp hết hàng. */
    @EntityGraph(attributePaths = {"category"})
    List<Product> findTop8ByStatusAndStockLessThanEqualOrderByStockAscIdAsc(ProductStatus status, int stock);
}
