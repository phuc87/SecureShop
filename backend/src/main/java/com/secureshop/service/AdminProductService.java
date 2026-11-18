package com.secureshop.service;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.product.AdminProductRequest;
import com.secureshop.dto.product.AdminProductResponse;
import com.secureshop.entity.Product;
import com.secureshop.entity.ProductImage;
import com.secureshop.entity.ProductSpec;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.BrandRepository;
import com.secureshop.repository.CategoryRepository;
import com.secureshop.repository.OrderItemRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.util.SlugUtil;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Quản lý sản phẩm của admin: danh sách (kể cả đang ẩn), thêm, sửa, ẩn/hiện, xoá. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminProductResponse> search(String q, Long categoryId, ProductStatus status, String stock,
                                                     int page, int size) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("sku")), like)));
            }
            if (categoryId != null) ps.add(cb.equal(root.get("category").get("id"), categoryId));
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if ("low".equals(stock)) ps.add(cb.lessThanOrEqualTo(root.get("stock"), 5));
            if ("out".equals(stock)) ps.add(cb.equal(root.get("stock"), 0));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return PageResponse.from(productRepository.findAll(spec, pageable), AdminProductResponse::summary);
    }

    @Transactional(readOnly = true)
    public AdminProductResponse get(Long id) {
        return AdminProductResponse.detail(load(id));
    }

    @Transactional
    public AdminProductResponse create(AdminProductRequest req) {
        Product p = new Product();
        apply(p, req);
        productRepository.save(p);
        log.info("Admin thêm sản phẩm #{} {}", p.getId(), p.getSku());
        return AdminProductResponse.detail(p);
    }

    @Transactional
    public AdminProductResponse update(Long id, AdminProductRequest req) {
        Product p = load(id);
        apply(p, req);
        productRepository.flush();
        return AdminProductResponse.detail(p);
    }

    @Transactional
    public AdminProductResponse setStatus(Long id, ProductStatus status) {
        Product p = load(id);
        p.setStatus(status);
        productRepository.flush();
        return AdminProductResponse.summary(p);
    }

    /** Chỉ xoá được sản phẩm chưa từng có trong đơn hàng; đã bán rồi thì phải ẩn để giữ lịch sử. */
    @Transactional
    public void delete(Long id) {
        Product p = load(id);
        if (orderItemRepository.existsByProductId(id)) {
            throw ApiException.conflict("Sản phẩm đã có trong đơn hàng nên không xoá được. Hãy chọn \"Ẩn\" để ngừng bán.");
        }
        productRepository.delete(p);
        log.info("Admin xoá sản phẩm #{} {}", id, p.getSku());
    }

    // ================================ NỘI BỘ ================================

    private Product load(Long id) {
        return productRepository.findWithCategoryById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
    }

    private void apply(Product p, AdminProductRequest req) {
        Long selfId = p.getId();
        String sku = req.sku().trim().toUpperCase();
        if (selfId == null ? productRepository.existsBySku(sku) : productRepository.existsBySkuAndIdNot(sku, selfId)) {
            throw ApiException.conflict("Mã SKU \"" + sku + "\" đã được dùng cho sản phẩm khác");
        }
        if (req.salePrice() != null && req.salePrice().compareTo(req.price()) >= 0) {
            throw ApiException.badRequest("Giá khuyến mãi phải nhỏ hơn giá gốc (để trống nếu không giảm giá)");
        }

        p.setName(req.name().trim());
        p.setSku(sku);
        p.setSlug(uniqueSlug(req.slug() == null || req.slug().isBlank() ? SlugUtil.slugify(req.name()) : req.slug(), selfId));
        p.setCategory(categoryRepository.findById(req.categoryId())
                .orElseThrow(() -> ApiException.badRequest("Danh mục không tồn tại")));
        p.setBrand(req.brandId() == null ? null : brandRepository.findById(req.brandId())
                .orElseThrow(() -> ApiException.badRequest("Thương hiệu không tồn tại")));
        p.setShortDescription(blankToNull(req.shortDescription()));
        p.setDescription(blankToNull(req.description()));
        p.setPrice(req.price());
        p.setSalePrice(req.salePrice());
        p.setStock(req.stock());
        p.setWarrantyMonths(req.warrantyMonths());
        p.setPlacement(req.placement());
        p.setStatus(req.status());
        p.setFeatured(req.featured());

        // Ảnh: thay toàn bộ danh sách, ảnh đầu tiên làm ảnh đại diện
        List<String> images = req.images() == null ? List.of() : req.images().stream().map(String::trim).distinct().toList();
        for (String url : images) {
            if (!url.matches("^/(api/files/products/[a-f0-9]{32}\\.(jpg|png|webp|gif)|images/products/[A-Za-z0-9._-]+)$")) {
                throw ApiException.badRequest("Ảnh không hợp lệ, hãy tải ảnh lên bằng nút \"Thêm ảnh\"");
            }
        }
        p.getImages().clear();
        for (int i = 0; i < images.size(); i++) {
            ProductImage img = new ProductImage();
            img.setProduct(p);
            img.setImageUrl(images.get(i));
            img.setSortOrder(i);
            p.getImages().add(img);
        }
        p.setThumbnailUrl(images.isEmpty() ? null : images.get(0));

        // Thông số: thay toàn bộ, không cho trùng mã
        List<AdminProductRequest.Spec> specs = req.specs() == null ? List.of() : req.specs();
        Set<String> keys = new HashSet<>();
        for (AdminProductRequest.Spec s : specs) {
            if (!keys.add(s.key())) throw ApiException.badRequest("Thông số \"" + s.key() + "\" bị trùng");
        }
        p.getSpecs().clear();
        if (selfId != null) productRepository.flush(); // xoá thông số cũ trước, tránh trùng khoá (product_id, spec_key)
        for (int i = 0; i < specs.size(); i++) {
            AdminProductRequest.Spec s = specs.get(i);
            ProductSpec ps = new ProductSpec();
            ps.setProduct(p);
            ps.setSpecKey(s.key());
            ps.setSpecLabel(s.label().trim());
            ps.setSpecValue(s.value().trim());
            ps.setSortOrder(i);
            p.getSpecs().add(ps);
        }
    }

    private String uniqueSlug(String base, Long selfId) {
        String root = base.isBlank() ? "san-pham" : base;
        String candidate = root;
        int n = 2;
        while (selfId == null ? productRepository.existsBySlug(candidate) : productRepository.existsBySlugAndIdNot(candidate, selfId)) {
            candidate = root + "-" + n++;
        }
        return candidate;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
