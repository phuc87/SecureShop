package com.secureshop.service;

import com.secureshop.dto.catalog.AdminBrandResponse;
import com.secureshop.dto.catalog.AdminCategoryResponse;
import com.secureshop.dto.catalog.BrandRequest;
import com.secureshop.dto.catalog.CategoryRequest;
import com.secureshop.entity.Brand;
import com.secureshop.entity.Category;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.BrandRepository;
import com.secureshop.repository.CategoryRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Admin quản lý danh mục và thương hiệu. Không cho xoá khi còn sản phẩm thuộc về nó. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminCatalogService {

    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    // ================================ DANH MỤC ================================

    @Transactional(readOnly = true)
    public List<AdminCategoryResponse> categories() {
        Map<Long, Long> counts = toMap(productRepository.countGroupByCategory());
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(c -> AdminCategoryResponse.from(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminCategoryResponse createCategory(CategoryRequest req) {
        Category c = new Category();
        applyCategory(c, req, null);
        categoryRepository.save(c);
        log.info("Admin thêm danh mục #{} {}", c.getId(), c.getName());
        return AdminCategoryResponse.from(c, 0);
    }

    @Transactional
    public AdminCategoryResponse updateCategory(Long id, CategoryRequest req) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục"));
        applyCategory(c, req, id);
        return AdminCategoryResponse.from(c, productRepository.countByCategoryId(id));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục"));
        long used = productRepository.countByCategoryId(id);
        if (used > 0) {
            throw ApiException.conflict("Danh mục \"" + c.getName() + "\" đang có " + used
                    + " sản phẩm. Hãy chuyển các sản phẩm sang danh mục khác trước khi xoá.");
        }
        categoryRepository.delete(c);
        log.info("Admin xoá danh mục #{} {}", id, c.getName());
    }

    private void applyCategory(Category c, CategoryRequest req, Long id) {
        String name = req.name().trim();
        String slug = slugOf(req.slug(), name);
        boolean nameTaken = id == null ? categoryRepository.existsByNameIgnoreCase(name)
                : categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id);
        if (nameTaken) throw ApiException.conflict("Đã có danh mục tên \"" + name + "\"");
        boolean slugTaken = id == null ? categoryRepository.existsBySlug(slug)
                : categoryRepository.existsBySlugAndIdNot(slug, id);
        if (slugTaken) throw ApiException.conflict("Đường dẫn (slug) \"" + slug + "\" đã được dùng");
        c.setName(name);
        c.setSlug(slug);
        c.setDescription(blankToNull(req.description()));
        c.setImageUrl(blankToNull(req.imageUrl()));
        c.setSortOrder(req.sortOrder() == null ? 0 : req.sortOrder());
    }

    // =============================== THƯƠNG HIỆU ===============================

    @Transactional(readOnly = true)
    public List<AdminBrandResponse> brands() {
        Map<Long, Long> counts = toMap(productRepository.countGroupByBrand());
        return brandRepository.findAllByOrderByNameAsc().stream()
                .map(b -> AdminBrandResponse.from(b, counts.getOrDefault(b.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminBrandResponse createBrand(BrandRequest req) {
        Brand b = new Brand();
        applyBrand(b, req, null);
        brandRepository.save(b);
        log.info("Admin thêm thương hiệu #{} {}", b.getId(), b.getName());
        return AdminBrandResponse.from(b, 0);
    }

    @Transactional
    public AdminBrandResponse updateBrand(Long id, BrandRequest req) {
        Brand b = brandRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thương hiệu"));
        applyBrand(b, req, id);
        return AdminBrandResponse.from(b, productRepository.countByBrandId(id));
    }

    @Transactional
    public void deleteBrand(Long id) {
        Brand b = brandRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thương hiệu"));
        long used = productRepository.countByBrandId(id);
        if (used > 0) {
            throw ApiException.conflict("Thương hiệu \"" + b.getName() + "\" đang có " + used
                    + " sản phẩm. Hãy đổi thương hiệu của các sản phẩm đó trước khi xoá.");
        }
        brandRepository.delete(b);
        log.info("Admin xoá thương hiệu #{} {}", id, b.getName());
    }

    private void applyBrand(Brand b, BrandRequest req, Long id) {
        String name = req.name().trim();
        String slug = slugOf(req.slug(), name);
        boolean nameTaken = id == null ? brandRepository.existsByNameIgnoreCase(name)
                : brandRepository.existsByNameIgnoreCaseAndIdNot(name, id);
        if (nameTaken) throw ApiException.conflict("Đã có thương hiệu tên \"" + name + "\"");
        boolean slugTaken = id == null ? brandRepository.existsBySlug(slug)
                : brandRepository.existsBySlugAndIdNot(slug, id);
        if (slugTaken) throw ApiException.conflict("Đường dẫn (slug) \"" + slug + "\" đã được dùng");
        b.setName(name);
        b.setSlug(slug);
        b.setLogoUrl(blankToNull(req.logoUrl()));
        b.setCountry(blankToNull(req.country()));
    }

    // ================================ NỘI BỘ ================================

    private static String slugOf(String requested, String name) {
        String slug = requested == null || requested.isBlank() ? SlugUtil.slugify(name) : requested.trim();
        if (slug.isBlank()) throw ApiException.badRequest("Tên phải có ít nhất 1 chữ cái hoặc chữ số");
        return slug.length() > 120 ? slug.substring(0, 120).replaceAll("-+$", "") : slug;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<Long, Long> toMap(List<Object[]> rows) {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] r : rows) m.put((Long) r[0], (Long) r[1]);
        return m;
    }
}
