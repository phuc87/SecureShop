package com.secureshop.dto.product;

import com.secureshop.entity.Product;
import com.secureshop.entity.ProductImage;
import com.secureshop.entity.enums.Placement;

import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(Long id, String sku, String name, String slug, String shortDescription,
                                    String description, BigDecimal price, BigDecimal salePrice,
                                    BigDecimal effectivePrice, int stock, int warrantyMonths, Placement placement,
                                    String thumbnailUrl, List<String> images, List<SpecItem> specs,
                                    CategoryResponse category, BrandResponse brand, int soldCount) {

    public record SpecItem(String key, String label, String value) {
    }

    public static ProductDetailResponse from(Product p) {
        return new ProductDetailResponse(p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getShortDescription(),
                p.getDescription(), p.getPrice(), p.getSalePrice(), p.getEffectivePrice(), p.getStock(),
                p.getWarrantyMonths(), p.getPlacement(), p.getThumbnailUrl(),
                p.getImages().stream().map(ProductImage::getImageUrl).toList(),
                p.getSpecs().stream().map(s -> new SpecItem(s.getSpecKey(), s.getSpecLabel(), s.getSpecValue())).toList(),
                CategoryResponse.from(p.getCategory()),
                p.getBrand() != null ? BrandResponse.from(p.getBrand()) : null,
                p.getSoldCount());
    }
}
