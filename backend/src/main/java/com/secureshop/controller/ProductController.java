package com.secureshop.controller;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.product.BrandResponse;
import com.secureshop.dto.product.CategoryResponse;
import com.secureshop.dto.product.CompareResponse;
import com.secureshop.dto.product.ProductDetailResponse;
import com.secureshop.dto.product.ProductSummaryResponse;
import com.secureshop.entity.enums.Placement;
import com.secureshop.dto.review.ProductReviewsResponse;
import com.secureshop.service.CompareService;
import com.secureshop.service.ProductService;
import com.secureshop.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ReviewService reviewService;
    private final CompareService compareService;

    /**
     * Danh sách sản phẩm có lọc và phân trang.
     * Ví dụ: /api/products?category=camera-ngoai-troi&maxPrice=1000000&sort=price_asc
     * sort: newest (mặc định) | price_asc | price_desc | best_selling
     * placement: INDOOR | OUTDOOR | BOTH
     * featured=true: chỉ sản phẩm nổi bật; onSale=true: chỉ sản phẩm đang giảm giá
     */
    @GetMapping("/products")
    public PageResponse<ProductSummaryResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Placement placement,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean onSale,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productService.search(q, category, brand, minPrice, maxPrice, placement, featured, onSale, sort, page, size);
    }

    /** GET /api/products/by-ids?ids=1,2,3 : giỏ hàng lấy giá/tồn kho mới nhất. */
    @GetMapping("/products/by-ids")
    public List<ProductSummaryResponse> byIds(@RequestParam(required = false) List<Long> ids) {
        return productService.getByIds(ids);
    }

    /** GET /api/products/compare?slugs=a,b : so sánh 2 sản phẩm + đề xuất nên chọn cái nào. */
    @GetMapping("/products/compare")
    public CompareResponse compare(@RequestParam(required = false) List<String> slugs) {
        return compareService.compare(slugs);
    }

    /** GET /api/products/{slug}/reviews?page=0 : điểm trung bình, phân bố sao, danh sách đánh giá. */
    @GetMapping("/products/{slug}/reviews")
    public ProductReviewsResponse reviews(@PathVariable String slug,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "5") int size) {
        return reviewService.forProduct(slug, page, size);
    }

    @GetMapping("/products/{slug}")
    public ProductDetailResponse detail(@PathVariable String slug) {
        return productService.getBySlug(slug);
    }

    @GetMapping("/categories")
    public List<CategoryResponse> categories() {
        return productService.getCategories();
    }

    @GetMapping("/brands")
    public List<BrandResponse> brands() {
        return productService.getBrands();
    }
}
