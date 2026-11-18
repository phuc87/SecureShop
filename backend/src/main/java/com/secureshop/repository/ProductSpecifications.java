package com.secureshop.repository;

import com.secureshop.entity.Product;
import com.secureshop.entity.enums.Placement;
import com.secureshop.entity.enums.ProductStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Ghép điều kiện lọc sản phẩm động: chỉ thêm điều kiện nào có giá trị. */
public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> filter(String keyword, String categorySlug, String brandSlug,
                                                BigDecimal minPrice, BigDecimal maxPrice,
                                                Placement placement, Boolean featured, Boolean onSale,
                                                String sort) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));

            // Giá thực tế = sale_price nếu có, ngược lại price
            Expression<BigDecimal> effectivePrice = cb.coalesce(root.get("salePrice"), root.get("price"));

            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("shortDescription")), like),
                        cb.like(cb.lower(root.get("sku")), like)));
            }
            if (categorySlug != null && !categorySlug.isBlank()) {
                predicates.add(cb.equal(root.join("category").get("slug"), categorySlug));
            }
            if (brandSlug != null && !brandSlug.isBlank()) {
                predicates.add(cb.equal(root.join("brand").get("slug"), brandSlug));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(effectivePrice, minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(effectivePrice, maxPrice));
            }
            if (Boolean.TRUE.equals(featured)) {
                predicates.add(cb.isTrue(root.get("featured")));
            }
            if (Boolean.TRUE.equals(onSale)) {
                predicates.add(cb.isNotNull(root.get("salePrice")));
            }
            if (placement != null) {
                // Thiết bị BOTH dùng được cả trong nhà và ngoài trời
                predicates.add(root.get("placement").in(placement, Placement.BOTH));
            }

            // Sắp xếp (bỏ qua với câu truy vấn đếm tổng số dòng)
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                switch (sort == null ? "newest" : sort) {
                    case "price_asc" -> query.orderBy(cb.asc(effectivePrice), cb.asc(root.get("id")));
                    case "price_desc" -> query.orderBy(cb.desc(effectivePrice), cb.asc(root.get("id")));
                    case "best_selling" -> query.orderBy(cb.desc(root.get("soldCount")), cb.asc(root.get("id")));
                    default -> query.orderBy(cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
