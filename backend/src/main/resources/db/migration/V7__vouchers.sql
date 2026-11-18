-- =====================================================================
-- SecureShop - V7: Mã giảm giá (voucher)
-- Admin tạo mã, khách nhập ở trang thanh toán. Số tiền giảm lưu ở orders.discount (có sẵn từ V1).
-- =====================================================================
CREATE TABLE IF NOT EXISTS vouchers (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    code            VARCHAR(30)   NOT NULL,                 -- luôn viết HOA, vd: GIAM50K
    description     VARCHAR(255)  NULL,                     -- hiện cho khách, vd: "Giảm 50.000đ cho đơn từ 1 triệu"
    discount_type   VARCHAR(10)   NOT NULL,                 -- PERCENT | FIXED
    discount_value  DECIMAL(15,2) NOT NULL,                 -- % (1-100) hoặc số tiền
    max_discount    DECIMAL(15,2) NULL,                     -- giảm tối đa (cho loại %), NULL = không giới hạn
    min_order       DECIMAL(15,2) NOT NULL DEFAULT 0,       -- đơn tối thiểu (tính trên tiền hàng)
    starts_at       DATETIME      NULL,                     -- NULL = có hiệu lực ngay
    ends_at         DATETIME      NULL,                     -- NULL = không hết hạn
    usage_limit     INT           NULL,                     -- tổng số lượt, NULL = không giới hạn
    used_count      INT           NOT NULL DEFAULT 0,       -- đã dùng (đơn bị huỷ thì trả lại)
    per_user_limit  INT           NOT NULL DEFAULT 1,       -- mỗi khách dùng tối đa mấy lần
    show_public     BOOLEAN       NOT NULL DEFAULT TRUE,    -- hiện trong danh sách gợi ý ở trang thanh toán
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_vouchers_code (code),
    CONSTRAINT chk_voucher_type CHECK (discount_type IN ('PERCENT', 'FIXED')),
    CONSTRAINT chk_voucher_value CHECK (discount_value > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Đơn hàng nhớ đã dùng mã nào (mã có thể bị sửa/xoá sau này nên lưu cả chữ)
ALTER TABLE orders
    ADD COLUMN voucher_id   BIGINT      NULL AFTER discount,
    ADD COLUMN voucher_code VARCHAR(30) NULL AFTER voucher_id,
    ADD CONSTRAINT fk_orders_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE SET NULL;

-- Vài mã mẫu để demo
INSERT INTO vouchers (code, description, discount_type, discount_value, max_discount, min_order, usage_limit, per_user_limit, ends_at) VALUES
('CHAOBANMOI', 'Giảm 10% cho đơn từ 500.000đ (tối đa 100.000đ)', 'PERCENT', 10, 100000, 500000, NULL, 1, NULL),
('GIAM50K',    'Giảm 50.000đ cho đơn từ 1.000.000đ',              'FIXED',   50000, NULL, 1000000, 100, 2, NULL),
('ANNINH200',  'Giảm 200.000đ cho đơn từ 5.000.000đ',             'FIXED',   200000, NULL, 5000000, 20, 1, DATE_ADD(NOW(), INTERVAL 30 DAY));
