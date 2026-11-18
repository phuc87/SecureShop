package com.secureshop.service;

import com.secureshop.dto.product.FavoriteResponse;
import com.secureshop.entity.Product;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.FavoriteRepository;
import com.secureshop.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Sản phẩm yêu thích: khách bấm trái tim để lưu sản phẩm, xem lại trong Tài khoản > Yêu thích. */
@Service
@RequiredArgsConstructor
public class FavoriteService {

    /** Giới hạn để 1 tài khoản không thêm vô hạn. */
    public static final int MAX_FAVORITES = 100;

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<FavoriteResponse> list(Long userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId).stream()
                .map(FavoriteResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> productIds(Long userId) {
        return favoriteRepository.productIdsOf(userId);
    }

    /** Thêm vào yêu thích. Bấm 2 lần (hoặc 2 tab) vẫn chỉ có 1 dòng. */
    @Transactional
    public void add(Long userId, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm"));
        if (!favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw ApiException.badRequest("Sản phẩm này đã ngừng kinh doanh");
            }
            if (favoriteRepository.countByUserId(userId) >= MAX_FAVORITES) {
                throw ApiException.badRequest("Danh sách yêu thích đã đủ " + MAX_FAVORITES
                        + " sản phẩm. Hãy bỏ bớt sản phẩm cũ trước khi thêm mới.");
            }
            // Không dùng save(): nếu 2 request cùng lúc, request sau vi phạm khoá duy nhất làm hỏng transaction (lỗi 500)
            favoriteRepository.insertIgnore(userId, productId);
        }
    }

    @Transactional
    public void remove(Long userId, Long productId) {
        favoriteRepository.deleteOne(userId, productId);
    }

    /**
     * Kết quả trả cho giao diện. Gọi SAU khi add/remove đã commit (transaction riêng),
     * để số đếm thấy cả thay đổi của request khác chạy cùng lúc.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> status(Long userId, Long productId) {
        return Map.of("productId", productId,
                "favorite", favoriteRepository.existsByUserIdAndProductId(userId, productId),
                "total", favoriteRepository.countByUserId(userId));
    }
}
