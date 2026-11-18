-- =====================================================================
-- SecureShop - V3: Tin nhắn từ form Liên hệ
-- Chạy trong phpMyAdmin (database secureshop_ai -> tab Import) nếu chưa có bảng này.
-- =====================================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    full_name   VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL,
    phone       VARCHAR(20)   NULL,
    subject     VARCHAR(30)   NOT NULL DEFAULT 'TU_VAN',
    message     TEXT          NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'NEW',
    user_id     BIGINT        NULL,                 -- người gửi nếu đang đăng nhập
    handled_by  BIGINT        NULL,                 -- admin đã xử lý
    handled_at  DATETIME      NULL,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contact_status (status, created_at),
    CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_contact_admin FOREIGN KEY (handled_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_contact_subject CHECK (subject IN ('TU_VAN', 'LAP_DAT', 'BAO_HANH', 'HOP_TAC', 'KHAC')),
    CONSTRAINT chk_contact_status CHECK (status IN ('NEW', 'HANDLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO contact_messages (full_name, email, phone, subject, message, status, handled_by, handled_at, created_at) VALUES
('Phạm Quốc Huy', 'huy.pham@example.com', '0938111222', 'LAP_DAT',
 'Mình cần lắp 6 camera cho kho hàng khoảng 300m² ở Bình Dương, shop có nhận khảo sát tận nơi không?',
 'NEW', NULL, NULL, NOW() - INTERVAL 5 HOUR),
('Đỗ Thị Mai', 'mai.do@example.com', NULL, 'BAO_HANH',
 'Khoá vân tay Philips mua tháng trước báo pin yếu dù mới thay pin, nhờ shop hướng dẫn.',
 'HANDLED', 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 DAY);
