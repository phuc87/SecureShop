-- Đánh dấu admin đã xem đánh giá hay chưa (để hiện thông báo "đánh giá mới" bên trang quản trị)
ALTER TABLE product_reviews
    ADD COLUMN admin_seen TINYINT(1) NOT NULL DEFAULT 0 AFTER comment,
    ADD INDEX idx_reviews_admin_seen (admin_seen, created_at);

-- Các đánh giá có từ trước coi như admin đã xem, chỉ đánh giá MỚI mới được thông báo
UPDATE product_reviews SET admin_seen = 1;
