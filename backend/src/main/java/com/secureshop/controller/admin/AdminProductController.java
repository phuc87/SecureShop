package com.secureshop.controller.admin;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.product.AdminProductRequest;
import com.secureshop.dto.product.AdminProductResponse;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.service.AdminProductService;
import com.secureshop.service.FileStorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService productService;
    private final FileStorageService fileStorage;

    /** GET /api/admin/products?q=ezviz&categoryId=1&status=HIDDEN&stock=low&page=0 */
    @GetMapping
    public PageResponse<AdminProductResponse> search(@RequestParam(required = false) String q,
                                                     @RequestParam(required = false) Long categoryId,
                                                     @RequestParam(required = false) ProductStatus status,
                                                     @RequestParam(required = false) String stock,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "15") int size) {
        return productService.search(q, categoryId, status, stock, page, size);
    }

    @GetMapping("/{id}")
    public AdminProductResponse get(@PathVariable Long id) {
        return productService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductResponse create(@Valid @RequestBody AdminProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public AdminProductResponse update(@PathVariable Long id, @Valid @RequestBody AdminProductRequest request) {
        return productService.update(id, request);
    }

    public record StatusRequest(@NotNull ProductStatus status) {
    }

    /** Ẩn / hiện nhanh: { "status": "HIDDEN" | "ACTIVE" } */
    @PatchMapping("/{id}/status")
    public AdminProductResponse setStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest body) {
        return productService.setStatus(id, body.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }

    /** Tải 1 ảnh sản phẩm lên, trả về { "url": "/api/files/products/xxx.jpg" } để gắn vào form. */
    @PostMapping(value = "/images", consumes = "multipart/form-data")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) {
        return Map.of("url", fileStorage.storeProductImage(file));
    }
}
