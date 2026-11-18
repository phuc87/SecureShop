package com.secureshop.service;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.product.BrandResponse;
import com.secureshop.dto.product.CategoryResponse;
import com.secureshop.dto.product.ProductDetailResponse;
import com.secureshop.dto.product.ProductSummaryResponse;
import com.secureshop.entity.Product;
import com.secureshop.entity.enums.Placement;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.BrandRepository;
import com.secureshop.repository.CategoryRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.ProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private static final int MAX_PAGE_SIZE = 48;

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;

    public PageResponse<ProductSummaryResponse> search(String q, String category, String brand,
                                                       BigDecimal minPrice, BigDecimal maxPrice,
                                                       Placement placement, Boolean featured, Boolean onSale,
                                                       String sort, int page, int size) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw ApiException.badRequest("Giá tối thiểu không được lớn hơn giá tối đa");
        }
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<Product> result = productRepository.findAll(
                ProductSpecifications.filter(q, category, brand, minPrice, maxPrice, placement, featured, onSale, sort), pageable);
        return PageResponse.from(result, ProductSummaryResponse::from);
    }

    public ProductDetailResponse getBySlug(String slug) {
        Product product = productRepository.findBySlugAndStatus(slug, ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        return ProductDetailResponse.from(product);
    }

    /**
     * Giá, tồn kho mới nhất cho giỏ hàng (giỏ lưu ở trình duyệt nên có thể đã cũ).
     * Chỉ trả sản phẩm đang bán; id nào không có trong kết quả = đã ngừng bán/bị xoá.
     */
    public List<ProductSummaryResponse> getByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        List<Long> unique = ids.stream().filter(java.util.Objects::nonNull).distinct().limit(50).toList();
        return productRepository.findByIdInAndStatus(unique, ProductStatus.ACTIVE).stream()
                .map(ProductSummaryResponse::from).toList();
    }

    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc().stream().map(CategoryResponse::from).toList();
    }

    public List<BrandResponse> getBrands() {
        return brandRepository.findAllByOrderByNameAsc().stream().map(BrandResponse::from).toList();
    }
}
