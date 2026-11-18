-- =====================================================================
-- SecureShop - V5: View "chat_history" để xem lịch sử chat dễ đọc trong phpMyAdmin
-- Dữ liệu thật vẫn nằm ở 2 bảng: conversations (cuộc trò chuyện) và messages (từng tin nhắn).
-- View chỉ ghép sẵn tên khách, người gửi, sản phẩm, file đính kèm -> không tốn thêm dung lượng.
-- Dùng: SELECT * FROM chat_history WHERE ma_hoi_thoai = 1;
-- =====================================================================
CREATE OR REPLACE VIEW chat_history AS
SELECT
    m.id                AS ma_tin,
    m.conversation_id   AS ma_hoi_thoai,
    cu.full_name        AS khach_hang,
    CASE m.sender_type
        WHEN 'CUSTOMER' THEN cu.full_name
        WHEN 'ADMIN'    THEN COALESCE(s.full_name, 'Quản trị viên')
        WHEN 'AI'       THEN 'Trợ lý AI'
        ELSE 'Hệ thống'
    END                 AS nguoi_gui,
    m.sender_type       AS vai_tro_gui,      -- CUSTOMER | ADMIN | AI | SYSTEM
    m.type              AS loai_tin,         -- TEXT | IMAGE | AUDIO | VIDEO | FILE | PRODUCT_CARD | CALL_LOG
    m.content           AS noi_dung,
    p.name              AS san_pham_dinh_kem,
    m.file_name         AS ten_file,
    m.file_url          AS duong_dan_file,   -- file thật nằm ở backend/uploads/chat/
    m.file_size         AS dung_luong_byte,
    m.created_at        AS gui_luc,
    m.seen_at           AS da_xem_luc,
    c.status            AS trang_thai_hoi_thoai
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN users cu        ON cu.id = c.customer_id
LEFT JOIN users s    ON s.id = m.sender_id
LEFT JOIN products p ON p.id = m.product_id
ORDER BY m.conversation_id, m.id;
