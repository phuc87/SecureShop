-- Khách sửa đánh giá của mình: lưu thời điểm sửa (NULL = chưa sửa lần nào) để hiện "(đã chỉnh sửa)"
ALTER TABLE product_reviews
    ADD COLUMN updated_at DATETIME NULL AFTER created_at;
