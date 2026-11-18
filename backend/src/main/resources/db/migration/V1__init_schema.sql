-- =====================================================================
-- SecureShop - V1: Tạo cấu trúc bảng (MySQL 8.0+, InnoDB, utf8mb4)
-- Các cột kiểu "enum" dùng VARCHAR + CHECK để khớp với
-- @Enumerated(EnumType.STRING) trong JPA.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NGƯỜI DÙNG & XÁC THỰC
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,                 -- BCrypt
    phone           VARCHAR(20)  NULL,
    avatar_url      VARCHAR(500) NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,     -- admin khóa tài khoản
    is_online       BOOLEAN      NOT NULL DEFAULT FALSE,
    last_seen_at    DATETIME     NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    CONSTRAINT chk_users_role CHECK (role IN ('CUSTOMER', 'ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE addresses (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    receiver_name   VARCHAR(100) NOT NULL,
    receiver_phone  VARCHAR(20)  NOT NULL,
    province        VARCHAR(100) NOT NULL,
    district        VARCHAR(100) NOT NULL,
    ward            VARCHAR(100) NOT NULL,
    street          VARCHAR(255) NOT NULL,
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_addresses_user (user_id),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token xác thực email / đặt lại mật khẩu (gửi qua email)
CREATE TABLE verification_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    token       VARCHAR(100) NOT NULL,
    type        VARCHAR(30)  NOT NULL,
    expires_at  DATETIME     NOT NULL,
    used_at     DATETIME     NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_vt_token (token),
    KEY idx_vt_user (user_id),
    CONSTRAINT fk_vt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_vt_type CHECK (type IN ('VERIFY_EMAIL', 'RESET_PASSWORD'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. SẢN PHẨM
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    parent_id    BIGINT       NULL,
    name         VARCHAR(100) NOT NULL,
    slug         VARCHAR(120) NOT NULL,
    description  VARCHAR(500) NULL,
    image_url    VARCHAR(500) NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_slug (slug),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE brands (
    id        BIGINT       NOT NULL AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    slug      VARCHAR(120) NOT NULL,
    logo_url  VARCHAR(500) NULL,
    country   VARCHAR(60)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    category_id        BIGINT        NOT NULL,
    brand_id           BIGINT        NULL,
    sku                VARCHAR(50)   NOT NULL,
    name               VARCHAR(255)  NOT NULL,
    slug               VARCHAR(280)  NOT NULL,
    short_description  VARCHAR(500)  NULL,
    description        TEXT          NULL,
    price              DECIMAL(15,2) NOT NULL,
    sale_price         DECIMAL(15,2) NULL,               -- NULL = không giảm giá
    stock              INT           NOT NULL DEFAULT 0,
    warranty_months    INT           NOT NULL DEFAULT 12,
    placement          VARCHAR(20)   NULL,               -- vị trí lắp, dùng cho bộ lọc và AI
    thumbnail_url      VARCHAR(500)  NULL,
    status             VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    is_featured        BOOLEAN       NOT NULL DEFAULT FALSE,
    sold_count         INT           NOT NULL DEFAULT 0,
    view_count         INT           NOT NULL DEFAULT 0,
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_products_sku (sku),
    UNIQUE KEY uk_products_slug (slug),
    KEY idx_products_category (category_id),
    KEY idx_products_brand (brand_id),
    KEY idx_products_price (price),
    KEY idx_products_status (status),
    FULLTEXT KEY ft_products_search (name, short_description),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL,
    CONSTRAINT chk_products_price CHECK (price >= 0),
    CONSTRAINT chk_products_sale CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price <= price)),
    CONSTRAINT chk_products_stock CHECK (stock >= 0),
    CONSTRAINT chk_products_placement CHECK (placement IS NULL OR placement IN ('INDOOR', 'OUTDOOR', 'BOTH')),
    CONSTRAINT chk_products_status CHECK (status IN ('ACTIVE', 'HIDDEN', 'DISCONTINUED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_images (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    product_id  BIGINT       NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_pi_product (product_id),
    CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thông số kỹ thuật dạng key-value: lọc được bằng SQL và AI tra cứu được
-- spec_key cố định (resolution_mp, ip_rating, connectivity...) để code xử lý,
-- spec_label / spec_value để hiển thị.
CREATE TABLE product_specs (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    product_id  BIGINT       NOT NULL,
    spec_key    VARCHAR(50)  NOT NULL,
    spec_label  VARCHAR(100) NOT NULL,
    spec_value  VARCHAR(255) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ps_product_key (product_id, spec_key),
    KEY idx_ps_key_value (spec_key, spec_value),
    CONSTRAINT fk_ps_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_reviews (
    id          BIGINT    NOT NULL AUTO_INCREMENT,
    product_id  BIGINT    NOT NULL,
    user_id     BIGINT    NOT NULL,
    order_id    BIGINT    NULL,          -- chỉ cho đánh giá khi đã mua (kiểm tra ở service)
    rating      TINYINT   NOT NULL,
    comment     TEXT      NULL,
    created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_review_once (product_id, user_id, order_id),
    KEY idx_review_product (product_id),
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. GIỎ HÀNG & ĐƠN HÀNG
-- ---------------------------------------------------------------------
CREATE TABLE carts (
    id          BIGINT    NOT NULL AUTO_INCREMENT,
    user_id     BIGINT    NOT NULL,
    updated_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_carts_user (user_id),
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
    id          BIGINT    NOT NULL AUTO_INCREMENT,
    cart_id     BIGINT    NOT NULL,
    product_id  BIGINT    NOT NULL,
    quantity    INT       NOT NULL DEFAULT 1,
    added_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ci_cart_product (cart_id, product_id),
    CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT chk_ci_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    order_code        VARCHAR(30)   NOT NULL,             -- vd: SS20261117-0001, hiển thị trong email
    user_id           BIGINT        NULL,                 -- NULL nếu tài khoản bị xóa, đơn vẫn giữ
    receiver_name     VARCHAR(100)  NOT NULL,
    receiver_phone    VARCHAR(20)   NOT NULL,
    receiver_email    VARCHAR(150)  NOT NULL,             -- email nhận xác nhận đơn
    shipping_address  VARCHAR(500)  NOT NULL,
    note              VARCHAR(500)  NULL,
    subtotal          DECIMAL(15,2) NOT NULL,
    shipping_fee      DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount          DECIMAL(15,2) NOT NULL DEFAULT 0,
    total             DECIMAL(15,2) NOT NULL,
    payment_method    VARCHAR(20)   NOT NULL DEFAULT 'COD',
    payment_status    VARCHAR(20)   NOT NULL DEFAULT 'UNPAID',
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    cancel_reason     VARCHAR(500)  NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_code (order_code),
    KEY idx_orders_user (user_id),
    KEY idx_orders_status (status),
    KEY idx_orders_created (created_at),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_orders_payment_method CHECK (payment_method IN ('COD', 'BANK_TRANSFER', 'VNPAY')),
    CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
    CONSTRAINT chk_orders_status CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chép tên + giá tại thời điểm mua, để sửa sản phẩm sau này không làm sai đơn cũ
CREATE TABLE order_items (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    order_id           BIGINT        NOT NULL,
    product_id         BIGINT        NULL,
    product_name       VARCHAR(255)  NOT NULL,
    product_sku        VARCHAR(50)   NOT NULL,
    product_thumbnail  VARCHAR(500)  NULL,
    unit_price         DECIMAL(15,2) NOT NULL,
    quantity           INT           NOT NULL,
    line_total         DECIMAL(15,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_oi_order (order_id),
    KEY idx_oi_product (product_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
    CONSTRAINT chk_oi_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_status_history (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    order_id     BIGINT       NOT NULL,
    from_status  VARCHAR(20)  NULL,
    to_status    VARCHAR(20)  NOT NULL,
    changed_by   BIGINT       NULL,
    note         VARCHAR(500) NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_osh_order (order_id),
    CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_osh_user FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. CHAT & GỌI VIDEO
-- ---------------------------------------------------------------------
CREATE TABLE conversations (
    id               BIGINT    NOT NULL AUTO_INCREMENT,
    customer_id      BIGINT    NOT NULL,
    admin_id         BIGINT    NULL,                    -- admin đã nhận hội thoại
    status           VARCHAR(20) NOT NULL DEFAULT 'AI',
    ai_summary       TEXT      NULL,                    -- tóm tắt nhu cầu khi chuyển cho admin
    unread_customer  INT       NOT NULL DEFAULT 0,
    unread_admin     INT       NOT NULL DEFAULT 0,
    last_message_at  DATETIME  NULL,
    created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at        DATETIME  NULL,
    PRIMARY KEY (id),
    KEY idx_conv_customer (customer_id),
    KEY idx_conv_admin (admin_id),
    KEY idx_conv_status_last (status, last_message_at),
    CONSTRAINT fk_conv_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_conv_status CHECK (status IN ('AI', 'WAITING', 'ACTIVE', 'CLOSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    conversation_id  BIGINT       NOT NULL,
    sender_id        BIGINT       NULL,                 -- NULL khi người gửi là AI/SYSTEM
    sender_type      VARCHAR(20)  NOT NULL,
    type             VARCHAR(20)  NOT NULL DEFAULT 'TEXT',
    content          TEXT         NULL,
    product_id       BIGINT       NULL,                 -- dùng khi type = PRODUCT_CARD
    file_url         VARCHAR(500) NULL,                 -- dùng khi type = FILE / IMAGE
    file_name        VARCHAR(255) NULL,
    seen_at          DATETIME     NULL,
    created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_msg_conv_created (conversation_id, created_at),
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_msg_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
    CONSTRAINT chk_msg_sender_type CHECK (sender_type IN ('CUSTOMER', 'ADMIN', 'AI', 'SYSTEM')),
    CONSTRAINT chk_msg_type CHECK (type IN ('TEXT', 'PRODUCT_CARD', 'IMAGE', 'FILE', 'CALL_LOG'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE call_logs (
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id   BIGINT      NOT NULL,
    caller_id         BIGINT      NULL,
    callee_id         BIGINT      NULL,
    call_type         VARCHAR(10) NOT NULL DEFAULT 'VIDEO',
    status            VARCHAR(20) NOT NULL DEFAULT 'RINGING',
    started_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at       DATETIME    NULL,
    ended_at          DATETIME    NULL,
    duration_seconds  INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_call_conv (conversation_id),
    CONSTRAINT fk_call_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_call_caller FOREIGN KEY (caller_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_call_callee FOREIGN KEY (callee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_call_type CHECK (call_type IN ('VIDEO', 'AUDIO')),
    CONSTRAINT chk_call_status CHECK (status IN ('RINGING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. AI TƯ VẤN (log để đánh giá và lấy dữ liệu train lại model)
-- ---------------------------------------------------------------------
CREATE TABLE ai_chat_logs (
    id                     BIGINT        NOT NULL AUTO_INCREMENT,
    conversation_id        BIGINT        NULL,
    user_id                BIGINT        NULL,           -- NULL với khách vãng lai
    session_id             VARCHAR(64)   NULL,           -- định danh khách vãng lai
    user_message           TEXT          NOT NULL,
    predicted_intent       VARCHAR(50)   NULL,
    confidence             DECIMAL(5,4)  NULL,           -- 0.0000 - 1.0000
    entities               JSON          NULL,           -- {"device":"camera","budget_max":2000000,...}
    bot_reply              TEXT          NULL,
    suggested_product_ids  JSON          NULL,           -- [3, 7]
    handed_off             BOOLEAN       NOT NULL DEFAULT FALSE,
    feedback               VARCHAR(10)   NULL,           -- khách bấm 👍 / 👎
    corrected_intent       VARCHAR(50)   NULL,           -- admin gán lại nhãn đúng -> xuất làm dữ liệu train
    model_version          VARCHAR(30)   NULL,
    response_ms            INT           NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_intent (predicted_intent),
    KEY idx_ai_created (created_at),
    KEY idx_ai_feedback (feedback),
    CONSTRAINT fk_ai_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_ai_feedback CHECK (feedback IS NULL OR feedback IN ('GOOD', 'BAD'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. EMAIL
-- ---------------------------------------------------------------------
CREATE TABLE email_logs (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    to_email          VARCHAR(150) NOT NULL,
    subject           VARCHAR(255) NOT NULL,
    template          VARCHAR(50)  NOT NULL,             -- order-confirmation, new-order-admin...
    related_order_id  BIGINT       NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    error_message     VARCHAR(1000) NULL,
    retry_count       INT          NOT NULL DEFAULT 0,
    sent_at           DATETIME     NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_email_status (status),
    KEY idx_email_order (related_order_id),
    CONSTRAINT fk_email_order FOREIGN KEY (related_order_id) REFERENCES orders (id) ON DELETE SET NULL,
    CONSTRAINT chk_email_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Khóa ngoại tạo sau vì bảng orders được tạo sau product_reviews
ALTER TABLE product_reviews
    ADD CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;
