package com.secureshop.controller;

import com.secureshop.dto.product.FavoriteResponse;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Sản phẩm yêu thích (chỉ CUSTOMER, cấu hình trong SecurityConfig: /api/favorites/**). */
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    /** Danh sách đầy đủ, mới thêm nằm trên. */
    @GetMapping
    public List<FavoriteResponse> list(@AuthenticationPrincipal UserPrincipal me) {
        return favoriteService.list(me.id());
    }

    /** Chỉ id sản phẩm: [3, 9, 15] để tô trái tim trên thẻ sản phẩm. */
    @GetMapping("/ids")
    public List<Long> ids(@AuthenticationPrincipal UserPrincipal me) {
        return favoriteService.productIds(me.id());
    }

    /** Thêm: PUT /api/favorites/9 -> { productId: 9, favorite: true, total: 4 } */
    @PutMapping("/{productId}")
    public Map<String, Object> add(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long productId) {
        favoriteService.add(me.id(), productId);
        return favoriteService.status(me.id(), productId);
    }

    /** Bỏ: DELETE /api/favorites/9 -> { productId: 9, favorite: false, total: 3 } */
    @DeleteMapping("/{productId}")
    public Map<String, Object> remove(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long productId) {
        favoriteService.remove(me.id(), productId);
        return favoriteService.status(me.id(), productId);
    }
}
