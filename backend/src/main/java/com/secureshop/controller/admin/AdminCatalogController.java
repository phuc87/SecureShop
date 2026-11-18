package com.secureshop.controller.admin;

import com.secureshop.dto.catalog.AdminBrandResponse;
import com.secureshop.dto.catalog.AdminCategoryResponse;
import com.secureshop.dto.catalog.BrandRequest;
import com.secureshop.dto.catalog.CategoryRequest;
import com.secureshop.service.AdminCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Danh mục & thương hiệu: /api/admin/categories, /api/admin/brands */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final AdminCatalogService catalogService;

    @GetMapping("/categories")
    public List<AdminCategoryResponse> categories() {
        return catalogService.categories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminCategoryResponse createCategory(@Valid @RequestBody CategoryRequest request) {
        return catalogService.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public AdminCategoryResponse updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return catalogService.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
    }

    @GetMapping("/brands")
    public List<AdminBrandResponse> brands() {
        return catalogService.brands();
    }

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminBrandResponse createBrand(@Valid @RequestBody BrandRequest request) {
        return catalogService.createBrand(request);
    }

    @PutMapping("/brands/{id}")
    public AdminBrandResponse updateBrand(@PathVariable Long id, @Valid @RequestBody BrandRequest request) {
        return catalogService.updateBrand(id, request);
    }

    @DeleteMapping("/brands/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(@PathVariable Long id) {
        catalogService.deleteBrand(id);
    }
}
