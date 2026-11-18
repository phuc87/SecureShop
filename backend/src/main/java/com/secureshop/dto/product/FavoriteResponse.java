package com.secureshop.dto.product;

import com.secureshop.entity.Favorite;
import com.secureshop.entity.enums.ProductStatus;

import java.time.LocalDateTime;

/**
 * 1 dòng trong trang "Sản phẩm yêu thích".
 * available=false: sản phẩm đã bị ẩn / ngừng kinh doanh (vẫn giữ trong danh sách để khách biết).
 */
public record FavoriteResponse(ProductSummaryResponse product, boolean available, LocalDateTime addedAt) {

    public static FavoriteResponse from(Favorite f) {
        return new FavoriteResponse(ProductSummaryResponse.from(f.getProduct()),
                f.getProduct().getStatus() == ProductStatus.ACTIVE, f.getCreatedAt());
    }
}
