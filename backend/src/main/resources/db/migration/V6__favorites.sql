-- =====================================================================
-- SecureShop - V6: Sản phẩm yêu thích (khách bấm trái tim để lưu lại xem sau)
-- Mỗi khách thích 1 sản phẩm tối đa 1 lần (uk_favorite_once).
-- Xoá khách hoặc xoá sản phẩm -> tự xoá dòng yêu thích (ON DELETE CASCADE).
-- =====================================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          BIGINT    NOT NULL AUTO_INCREMENT,
    user_id     BIGINT    NOT NULL,
    product_id  BIGINT    NOT NULL,
    created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_favorite_once (user_id, product_id),
    KEY idx_favorite_product (product_id),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
