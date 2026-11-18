-- =====================================================================
-- SecureShop - Tạo database và user cho ứng dụng
-- Chạy 1 lần bằng tài khoản root (MySQL Workbench hoặc mysql CLI).
-- Sau đó các bảng sẽ do Flyway tạo khi chạy Spring Boot
-- (backend/src/main/resources/db/migration/V1__..., V2__...).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS secureshop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- User riêng cho ứng dụng, không dùng root trong Spring Boot.
-- Đổi mật khẩu bên dưới và đặt cùng giá trị vào biến môi trường DB_PASSWORD.
CREATE USER IF NOT EXISTS 'secureshop'@'localhost' IDENTIFIED BY 'SecureShop@2026';
GRANT ALL PRIVILEGES ON secureshop.* TO 'secureshop'@'localhost';
FLUSH PRIVILEGES;
