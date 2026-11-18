package com.secureshop.dto.product;

import com.secureshop.entity.Product;
import com.secureshop.entity.enums.Placement;

import java.math.BigDecimal;

/** Dùng cho danh sách sản phẩm và thẻ sản phẩm trong chat. */
public record ProductSummaryResponse(Long id, String sku, String name, String slug, String shortDescription,
                                     BigDecimal price, BigDecimal salePrice, BigDecimal effectivePrice,
                                     int stock, Placement placement, String thumbnailUrl, boolean featured,
                                     int soldCount, String categoryName, String brandName) {

    public static ProductSummaryResponse from(Product p) {
        return new ProductSummaryResponse(p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getShortDescription(),
                p.getPrice(), p.getSalePrice(), p.getEffectivePrice(), p.getStock(), p.getPlacement(),
                p.getThumbnailUrl(), p.isFeatured(), p.getSoldCount(),
                p.getCategory().getName(), p.getBrand() != null ? p.getBrand().getName() : null);
    }
}
