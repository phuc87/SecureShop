-- =====================================================================
-- SecureShop - V4: Chat hỗ trợ ghi âm, video, thông tin file đính kèm
-- Chạy trong phpMyAdmin (database secureshop_ai -> tab SQL hoặc Import).
-- =====================================================================

-- Thêm loại tin AUDIO (ghi âm / file âm thanh) và VIDEO
ALTER TABLE messages DROP CONSTRAINT chk_msg_type;
ALTER TABLE messages ADD CONSTRAINT chk_msg_type
    CHECK (type IN ('TEXT', 'PRODUCT_CARD', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'CALL_LOG'));

-- Thông tin file đính kèm
ALTER TABLE messages
    ADD COLUMN file_size BIGINT       NULL AFTER file_name,
    ADD COLUMN mime_type VARCHAR(100) NULL AFTER file_size;

-- Danh sách hội thoại cho admin sắp xếp theo tin mới nhất
CREATE INDEX idx_conv_last_message ON conversations (last_message_at);
