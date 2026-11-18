package com.secureshop.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secureshop.entity.Product;
import com.secureshop.entity.ProductImage;
import com.secureshop.entity.enums.Placement;
import com.secureshop.entity.enums.ProductStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Sản phẩm phía admin (kể cả sản phẩm đang ẩn). images/specs chỉ có ở trang sửa. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminProductResponse(Long id, String sku, String name, String slug, String thumbnailUrl,
                                   Long categoryId, String categoryName, Long brandId, String brandName,
                                   BigDecimal price, BigDecimal salePrice, int stock, int soldCount,
                                   ProductStatus status, boolean featured, Placement placement, Integer warrantyMonths,
                                   String shortDescription, String description, List<String> images,
                                   List<AdminProductRequest.Spec> specs, LocalDateTime updatedAt) {

    public static AdminProductResponse summary(Product p) {
        return new AdminProductResponse(p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getThumbnailUrl(),
                p.getCategory().getId(), p.getCategory().getName(),
                p.getBrand() != null ? p.getBrand().getId() : null, p.getBrand() != null ? p.getBrand().getName() : null,
                p.getPrice(), p.getSalePrice(), p.getStock(), p.getSoldCount(), p.getStatus(), p.isFeatured(),
                p.getPlacement(), null, null, null, null, null, p.getUpdatedAt());
    }

    public static AdminProductResponse detail(Product p) {
        return new AdminProductResponse(p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getThumbnailUrl(),
                p.getCategory().getId(), p.getCategory().getName(),
                p.getBrand() != null ? p.getBrand().getId() : null, p.getBrand() != null ? p.getBrand().getName() : null,
                p.getPrice(), p.getSalePrice(), p.getStock(), p.getSoldCount(), p.getStatus(), p.isFeatured(),
                p.getPlacement(), p.getWarrantyMonths(), p.getShortDescription(), p.getDescription(),
                p.getImages().stream().map(ProductImage::getImageUrl).toList(),
                p.getSpecs().stream().map(s -> new AdminProductRequest.Spec(s.getSpecKey(), s.getSpecLabel(), s.getSpecValue())).toList(),
                p.getUpdatedAt());
    }
}
