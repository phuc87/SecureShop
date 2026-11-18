-- =====================================================================
-- SecureShop - V2: Dữ liệu mẫu để chạy thử và demo
-- Giá và thông số là DỮ LIỆU MẪU, hãy kiểm tra/cập nhật lại trước khi demo.
--
-- Tài khoản (mật khẩu đã băm BCrypt):
--   admin@secureshop.vn    / Admin@123     (ADMIN)
--   tuvan@secureshop.vn    / Admin@123     (ADMIN - tư vấn viên)
--   khachhang1@example.com / Customer@123  (CUSTOMER)
--   khachhang2@example.com / Customer@123  (CUSTOMER)
-- Muốn nhận email "có đơn mới" thì đổi email admin thành Gmail thật của bạn.
-- =====================================================================

-- ---------------------------------------------------------------------
-- NGƯỜI DÙNG
-- ---------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, phone, role, email_verified) VALUES
(1, 'Quản trị viên',   'admin@secureshop.vn',    '$2a$10$JYy5jaz2pI/jsdULXvEbpe0NPLSmLafRV4ZhDrxV4g0HX7jC.L2Ga', '0901000001', 'ADMIN',    TRUE),
(2, 'Nguyễn Văn An',   'khachhang1@example.com', '$2a$10$Gpb69qyNKB.Fp0I0EYH6x.VvqXuFGHRGr4PvaYL1bwLm/XfGVYu.i', '0912345678', 'CUSTOMER', TRUE),
(3, 'Trần Thị Bình',   'khachhang2@example.com', '$2a$10$Gpb69qyNKB.Fp0I0EYH6x.VvqXuFGHRGr4PvaYL1bwLm/XfGVYu.i', '0987654321', 'CUSTOMER', TRUE),
(4, 'Lê Minh Tư Vấn',  'tuvan@secureshop.vn',    '$2a$10$JYy5jaz2pI/jsdULXvEbpe0NPLSmLafRV4ZhDrxV4g0HX7jC.L2Ga', '0901000002', 'ADMIN',    TRUE);

INSERT INTO addresses (user_id, receiver_name, receiver_phone, province, district, ward, street, is_default) VALUES
(2, 'Nguyễn Văn An', '0912345678', 'TP. Hồ Chí Minh', 'Quận 10',       'Phường 12',        '268 Lý Thường Kiệt', TRUE),
(3, 'Trần Thị Bình', '0987654321', 'Hà Nội',          'Quận Cầu Giấy', 'Phường Dịch Vọng', '144 Xuân Thủy',      TRUE);

-- ---------------------------------------------------------------------
-- DANH MỤC & THƯƠNG HIỆU
-- ---------------------------------------------------------------------
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
(1, 'Camera WiFi trong nhà', 'camera-wifi-trong-nha', 'Camera quan sát trong nhà, lắp đặt nhanh, xem qua điện thoại', 1),
(2, 'Camera ngoài trời',     'camera-ngoai-troi',     'Camera chống nước bụi, quan sát ban đêm cho sân, cổng, mặt tiền', 2),
(3, 'Đầu ghi hình',          'dau-ghi-hinh',          'Đầu ghi NVR/DVR cho hệ thống nhiều camera', 3),
(4, 'Khóa cửa thông minh',   'khoa-cua-thong-minh',   'Khóa vân tay, mật mã, thẻ từ, mở bằng ứng dụng', 4),
(5, 'Chuông cửa có hình',    'chuong-cua-co-hinh',    'Chuông cửa có camera, đàm thoại với khách từ xa', 5),
(6, 'Cảm biến & báo động',   'cam-bien-bao-dong',     'Cảm biến cửa, chuyển động, còi hú chống trộm', 6),
(7, 'Phụ kiện',              'phu-kien',              'Thẻ nhớ, ổ cứng chuyên dụng cho camera', 7);

INSERT INTO brands (id, name, slug, country) VALUES
(1,  'Ezviz',           'ezviz',           'Trung Quốc'),
(2,  'Imou',            'imou',            'Trung Quốc'),
(3,  'Hikvision',       'hikvision',       'Trung Quốc'),
(4,  'Dahua',           'dahua',           'Trung Quốc'),
(5,  'TP-Link Tapo',    'tp-link-tapo',    'Trung Quốc'),
(6,  'Xiaomi',          'xiaomi',          'Trung Quốc'),
(7,  'KBVision',        'kbvision',        'Mỹ'),
(8,  'Philips',         'philips',         'Hà Lan'),
(9,  'Kaadas',          'kaadas',          'Đức'),
(10, 'Western Digital', 'western-digital', 'Mỹ'),
(11, 'Kingston',        'kingston',        'Mỹ');

-- ---------------------------------------------------------------------
-- SẢN PHẨM
-- ---------------------------------------------------------------------
INSERT INTO products (id, category_id, brand_id, sku, name, slug, short_description, price, sale_price, stock, warranty_months, placement, thumbnail_url, is_featured, sold_count) VALUES
-- Camera trong nhà
(1,  1, 1,  'EZ-C6N-2MP',    'Camera WiFi Ezviz C6N 2MP xoay 360°',          'camera-wifi-ezviz-c6n-2mp',         'Full HD 1080p, xoay 360°, đàm thoại 2 chiều, phát hiện chuyển động',               590000,  520000, 50, 24, 'INDOOR',  '/images/products/ezviz-c6n.jpg',        TRUE,  128),
(2,  1, 1,  'EZ-C6-4MP',     'Camera WiFi Ezviz C6 4MP 2K xoay 360°',        'camera-wifi-ezviz-c6-4mp',          'Độ phân giải 2K, AI phát hiện người, theo dõi chuyển động thông minh',             890000,  NULL,   35, 24, 'INDOOR',  '/images/products/ezviz-c6.jpg',         TRUE,   76),
(3,  1, 2,  'IM-RANGER2-2MP','Camera WiFi Imou Ranger 2 2MP',                'camera-wifi-imou-ranger-2-2mp',     'Xoay 360°, phát hiện người, còi báo động tích hợp',                                 550000,  490000, 60, 24, 'INDOOR',  '/images/products/imou-ranger2.jpg',     FALSE, 142),
(4,  1, 2,  'IM-RANGER2C-4MP','Camera WiFi Imou Ranger 2C 4MP',              'camera-wifi-imou-ranger-2c-4mp',    'Độ phân giải 2K, quan sát ban đêm 10m, lưu trữ thẻ nhớ và Cloud',                   750000,  NULL,   40, 24, 'INDOOR',  '/images/products/imou-ranger2c.jpg',    FALSE,  58),
(5,  1, 5,  'TP-C200',       'Camera WiFi TP-Link Tapo C200 2MP',            'camera-wifi-tp-link-tapo-c200',     'Giá tốt, xoay 360°, chế độ riêng tư, hỗ trợ thẻ nhớ 512GB',                         520000,  NULL,   70, 24, 'INDOOR',  '/images/products/tapo-c200.jpg',        FALSE, 210),
(6,  1, 5,  'TP-C210',       'Camera WiFi TP-Link Tapo C210 3MP',            'camera-wifi-tp-link-tapo-c210',     'Độ phân giải 3MP 2K, xoay 360°, phát hiện chuyển động',                             650000,  590000, 45, 24, 'INDOOR',  '/images/products/tapo-c210.jpg',        TRUE,   97),
(7,  1, 6,  'XM-C300',       'Camera Xiaomi Smart Camera C300 2K',           'camera-xiaomi-smart-camera-c300',   '2K 3MP, AI phát hiện người, tích hợp hệ sinh thái Mi Home',                         790000,  NULL,   30, 12, 'INDOOR',  '/images/products/xiaomi-c300.jpg',      FALSE,  64),
-- Camera ngoài trời
(8,  2, 1,  'EZ-H3C-2MP',    'Camera WiFi ngoài trời Ezviz H3C 2MP',         'camera-ngoai-troi-ezviz-h3c-2mp',   'Thân cố định, chống nước IP67, có màu ban đêm, đèn và còi báo động',                990000,  NULL,   40, 24, 'OUTDOOR', '/images/products/ezviz-h3c.jpg',        FALSE,  81),
(9,  2, 1,  'EZ-H8C-4MP',    'Camera WiFi ngoài trời Ezviz H8C 4MP xoay 360°','camera-ngoai-troi-ezviz-h8c-4mp',  'Xoay 360° ngoài trời, 2K, có màu ban đêm, AI phát hiện người',                      1490000, 1350000,25, 24, 'OUTDOOR', '/images/products/ezviz-h8c.jpg',        TRUE,   69),
(10, 2, 2,  'IM-CRUISER-4MP','Camera WiFi ngoài trời Imou Cruiser 4MP',      'camera-ngoai-troi-imou-cruiser-4mp','Xoay 355°, có màu ban đêm 30m, IP66, đàm thoại 2 chiều',                            1590000, NULL,   20, 24, 'OUTDOOR', '/images/products/imou-cruiser.jpg',     FALSE,  33),
(11, 2, 2,  'IM-BULLET2E-2MP','Camera WiFi ngoài trời Imou Bullet 2E 2MP',   'camera-ngoai-troi-imou-bullet-2e',  'Thân trụ chống nước IP67, hồng ngoại 30m, giá rẻ',                                  790000,  NULL,   55, 24, 'OUTDOOR', '/images/products/imou-bullet2e.jpg',    FALSE, 115),
(12, 2, 5,  'TP-C310',       'Camera WiFi ngoài trời TP-Link Tapo C310 3MP', 'camera-ngoai-troi-tp-link-tapo-c310','3MP, IP66, quan sát ban đêm 30m, cổng LAN dự phòng',                            1050000, NULL,   30, 24, 'OUTDOOR', '/images/products/tapo-c310.jpg',        FALSE,  47),
(13, 2, 3,  'HIK-1023G0E-I', 'Camera IP PoE Hikvision DS-2CD1023G0E-I 2MP',  'camera-ip-poe-hikvision-2cd1023g0e','Camera IP thân trụ, cấp nguồn PoE, IP67, dùng cho hệ thống đầu ghi',               950000,  NULL,   80, 24, 'OUTDOOR', '/images/products/hik-1023.jpg',         FALSE, 160),
(14, 2, 4,  'DH-HFW1230S1',  'Camera IP PoE Dahua IPC-HFW1230S1 2MP',        'camera-ip-poe-dahua-hfw1230s1',     'Camera IP thân trụ, PoE, hồng ngoại 30m, chuẩn H.265',                              890000,  NULL,   70, 24, 'OUTDOOR', '/images/products/dahua-1230.jpg',       FALSE, 132),
(15, 2, 7,  'KB-A2111N2',    'Camera Analog HD KBVision KX-A2111N2 2MP',     'camera-analog-kbvision-kx-a2111n2', 'Camera analog 4 trong 1, giá rẻ, dùng với đầu ghi DVR',                             450000,  NULL,   90, 24, 'BOTH',    '/images/products/kb-2111.jpg',          FALSE, 188),
-- Đầu ghi
(16, 3, 3,  'HIK-7104NI-Q1-4P','Đầu ghi IP Hikvision DS-7104NI-Q1/4P 4 kênh PoE','dau-ghi-hikvision-7104ni-4-kenh-poe','4 kênh, tích hợp 4 cổng PoE, 1 ổ cứng tới 8TB, xem qua Hik-Connect',         2390000, NULL,   20, 24, NULL,      '/images/products/hik-nvr-7104.jpg',     TRUE,   41),
(17, 3, 4,  'DH-NVR2108HS-8P','Đầu ghi IP Dahua NVR2108HS-8P 8 kênh PoE',    'dau-ghi-dahua-nvr2108hs-8-kenh-poe','8 kênh, 8 cổng PoE, H.265+, phù hợp cửa hàng và văn phòng',                        3290000, NULL,   15, 24, NULL,      '/images/products/dahua-nvr-2108.jpg',   FALSE,  22),
(18, 3, 1,  'EZ-X5S-4CH',    'Đầu ghi WiFi Ezviz X5S 4 kênh',                'dau-ghi-wifi-ezviz-x5s-4-kenh',     'Đầu ghi không dây cho camera WiFi Ezviz, hỗ trợ ổ cứng 6TB',                        1890000, NULL,   12, 24, NULL,      '/images/products/ezviz-x5s.jpg',        FALSE,  18),
(19, 3, 7,  'KB-7104SD6',    'Đầu ghi KBVision KX-A7104SD6 4 kênh 5in1',     'dau-ghi-kbvision-kx-a7104sd6',      'Đầu ghi lai 4 kênh, hỗ trợ camera analog và IP',                                    1150000, NULL,   25, 24, NULL,      '/images/products/kb-dvr-7104.jpg',      FALSE,  37),
-- Khóa cửa
(20, 4, 8,  'PH-9300',       'Khóa cửa vân tay Philips Easykey 9300',        'khoa-van-tay-philips-easykey-9300', '5 cách mở: vân tay, mã số, thẻ, chìa cơ, ứng dụng; kết nối WiFi',                   8900000, 7990000,10, 24, 'BOTH',    '/images/products/philips-9300.jpg',     TRUE,   19),
(21, 4, 8,  'PH-DDL702',     'Khóa cửa nhận diện khuôn mặt Philips DDL702',  'khoa-khuon-mat-philips-ddl702',     'Nhận diện khuôn mặt 3D, vân tay, camera mắt mèo, màn hình trong nhà',              12500000, NULL,   6, 24, 'BOTH',    '/images/products/philips-ddl702.jpg',   FALSE,   7),
(22, 4, 9,  'KD-K9',         'Khóa cửa vân tay Kaadas K9',                   'khoa-van-tay-kaadas-k9',            'Thiết kế đẩy kéo, vân tay bán dẫn, mã số chống nhìn trộm',                          6900000, NULL,    8, 24, 'BOTH',    '/images/products/kaadas-k9.jpg',        FALSE,  12),
(23, 4, 6,  'XM-M20',        'Khóa cửa thông minh Xiaomi Smart Door Lock M20','khoa-thong-minh-xiaomi-m20',       'Vân tay, NFC, mã số, mở qua Mi Home, cảnh báo cạy phá',                             5490000, NULL,   12, 12, 'BOTH',    '/images/products/xiaomi-m20.jpg',       FALSE,  15),
(24, 4, 1,  'EZ-DL01S',      'Khóa cửa vân tay Ezviz DL01S',                 'khoa-van-tay-ezviz-dl01s',          'Vân tay, mã số, thẻ từ, chìa cơ; phù hợp cửa gỗ chung cư',                          4290000, NULL,   14, 24, 'INDOOR',  '/images/products/ezviz-dl01s.jpg',      FALSE,  21),
-- Chuông cửa
(25, 5, 1,  'EZ-DB1C',       'Chuông cửa có hình WiFi Ezviz DB1C',           'chuong-cua-co-hinh-ezviz-db1c',     'Camera 1080p, đàm thoại 2 chiều, nhận cuộc gọi trên điện thoại',                    1690000, NULL,   25, 24, 'OUTDOOR', '/images/products/ezviz-db1c.jpg',       TRUE,   44),
(26, 5, 2,  'IM-DB11',       'Chuông cửa có hình WiFi Imou DB11',            'chuong-cua-co-hinh-imou-db11',      'Camera 2MP, phát hiện người, IP65, dùng nguồn điện chuông có sẵn',                  1390000, NULL,   30, 24, 'OUTDOOR', '/images/products/imou-db11.jpg',        FALSE,  29),
(27, 5, 3,  'HIK-KIS202T',   'Bộ chuông cửa màn hình Hikvision DS-KIS202T 7"','bo-chuong-cua-hikvision-kis202t',  'Màn hình trong nhà 7 inch, nút gọi ngoài trời có camera, mở khóa điện',             2890000, NULL,   10, 24, 'BOTH',    '/images/products/hik-kis202t.jpg',      FALSE,  11),
-- Cảm biến & báo động
(28, 6, 1,  'EZ-A1-KIT',     'Bộ kit báo động Ezviz A1 (Hub + cảm biến)',    'bo-kit-bao-dong-ezviz-a1',          'Gồm hub trung tâm, 1 cảm biến cửa, 1 cảm biến chuyển động, còi 100dB',              1990000, 1790000,15, 12, 'INDOOR',  '/images/products/ezviz-a1-kit.jpg',     FALSE,  26),
(29, 6, 2,  'IM-ZP1',        'Cảm biến chuyển động hồng ngoại Imou ZP1',     'cam-bien-chuyen-dong-imou-zp1',     'Phát hiện chuyển động trong 8m, pin 2 năm, kết nối qua gateway',                     390000,  NULL,   40, 12, 'INDOOR',  '/images/products/imou-zp1.jpg',         FALSE,  52),
(30, 6, 6,  'XM-DOOR-S2',    'Cảm biến cửa Xiaomi Door and Window Sensor 2', 'cam-bien-cua-xiaomi-sensor-2',      'Báo khi cửa mở, cảm biến ánh sáng, chạy pin CR2032',                                 190000,  NULL,  100, 12, 'INDOOR',  '/images/products/xiaomi-door-s2.jpg',   FALSE, 175),
(31, 6, 2,  'IM-ZS1',        'Còi báo động không dây Imou ZS1',              'coi-bao-dong-khong-day-imou-zs1',   'Còi 110dB có đèn chớp, kết hợp camera và cảm biến Imou',                             450000,  NULL,   35, 12, 'BOTH',    '/images/products/imou-zs1.jpg',         FALSE,  31),
-- Phụ kiện
(32, 7, 11, 'KS-HE-64',      'Thẻ nhớ Kingston High Endurance 64GB',         'the-nho-kingston-high-endurance-64gb','Thẻ nhớ chuyên ghi hình liên tục cho camera',                                     220000,  NULL,  200, 36, NULL,      '/images/products/kingston-64.jpg',      FALSE, 420),
(33, 7, 11, 'KS-HE-128',     'Thẻ nhớ Kingston High Endurance 128GB',        'the-nho-kingston-high-endurance-128gb','Dung lượng lớn, ghi hình 2K liên tục khoảng 15-20 ngày',                         350000,  NULL,  150, 36, NULL,      '/images/products/kingston-128.jpg',     FALSE, 260),
(34, 7, 10, 'WD-PURPLE-1TB', 'Ổ cứng WD Purple 1TB chuyên camera',           'o-cung-wd-purple-1tb',              'Ổ cứng chuyên dụng cho đầu ghi, chạy 24/7',                                         1350000, NULL,   40, 36, NULL,      '/images/products/wd-purple-1tb.jpg',    FALSE,  88),
(35, 7, 10, 'WD-PURPLE-2TB', 'Ổ cứng WD Purple 2TB chuyên camera',           'o-cung-wd-purple-2tb',              'Lưu trữ khoảng 30 ngày cho hệ 4 camera 2MP',                                        1790000, NULL,   30, 36, NULL,      '/images/products/wd-purple-2tb.jpg',    FALSE,  54);

INSERT INTO product_images (product_id, image_url, sort_order)
SELECT id, thumbnail_url, 0 FROM products;

-- Thông số kỹ thuật
-- Khóa chuẩn: resolution_mp, resolution, view_angle, night_vision, night_distance_m,
-- ip_rating, connectivity, storage, pan_tilt, ai_detection, channels, poe_ports,
-- max_hdd, unlock_methods, battery, capacity, power
INSERT INTO product_specs (product_id, spec_key, spec_label, spec_value, sort_order) VALUES
(1,'resolution_mp','Độ phân giải (MP)','2',1),(1,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(1,'pan_tilt','Xoay quét','Ngang 340°, dọc 55°',3),(1,'night_distance_m','Tầm nhìn đêm (m)','10',4),(1,'connectivity','Kết nối','WiFi 2.4GHz',5),(1,'storage','Lưu trữ','Thẻ nhớ tối đa 256GB, Cloud',6),
(2,'resolution_mp','Độ phân giải (MP)','4',1),(2,'resolution','Độ phân giải','2560×1440 (2K)',2),(2,'pan_tilt','Xoay quét','Ngang 340°, dọc 55°',3),(2,'night_distance_m','Tầm nhìn đêm (m)','10',4),(2,'connectivity','Kết nối','WiFi 2.4GHz',5),(2,'ai_detection','AI','Phát hiện người, theo dõi chuyển động',6),
(3,'resolution_mp','Độ phân giải (MP)','2',1),(3,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(3,'pan_tilt','Xoay quét','Ngang 355°, dọc 90°',3),(3,'night_distance_m','Tầm nhìn đêm (m)','10',4),(3,'connectivity','Kết nối','WiFi 2.4GHz',5),(3,'ai_detection','AI','Phát hiện người, còi báo động',6),
(4,'resolution_mp','Độ phân giải (MP)','4',1),(4,'resolution','Độ phân giải','2560×1440 (2K)',2),(4,'pan_tilt','Xoay quét','Ngang 355°, dọc 90°',3),(4,'night_distance_m','Tầm nhìn đêm (m)','10',4),(4,'connectivity','Kết nối','WiFi 2.4GHz',5),(4,'storage','Lưu trữ','Thẻ nhớ tối đa 256GB, Cloud',6),
(5,'resolution_mp','Độ phân giải (MP)','2',1),(5,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(5,'pan_tilt','Xoay quét','Ngang 360°, dọc 114°',3),(5,'night_distance_m','Tầm nhìn đêm (m)','9',4),(5,'connectivity','Kết nối','WiFi 2.4GHz',5),(5,'storage','Lưu trữ','Thẻ nhớ tối đa 512GB',6),
(6,'resolution_mp','Độ phân giải (MP)','3',1),(6,'resolution','Độ phân giải','2304×1296 (2K)',2),(6,'pan_tilt','Xoay quét','Ngang 360°, dọc 114°',3),(6,'night_distance_m','Tầm nhìn đêm (m)','9',4),(6,'connectivity','Kết nối','WiFi 2.4GHz',5),(6,'storage','Lưu trữ','Thẻ nhớ tối đa 512GB',6),
(7,'resolution_mp','Độ phân giải (MP)','3',1),(7,'resolution','Độ phân giải','2304×1296 (2K)',2),(7,'pan_tilt','Xoay quét','Ngang 360°, dọc 108°',3),(7,'night_distance_m','Tầm nhìn đêm (m)','10',4),(7,'connectivity','Kết nối','WiFi 2.4GHz',5),(7,'ai_detection','AI','Phát hiện người',6),
(8,'resolution_mp','Độ phân giải (MP)','2',1),(8,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(8,'ip_rating','Chống nước bụi','IP67',3),(8,'night_vision','Ban đêm','Có màu (đèn trợ sáng)',4),(8,'night_distance_m','Tầm nhìn đêm (m)','30',5),(8,'connectivity','Kết nối','WiFi 2.4GHz',6),
(9,'resolution_mp','Độ phân giải (MP)','4',1),(9,'resolution','Độ phân giải','2560×1440 (2K)',2),(9,'ip_rating','Chống nước bụi','IP65',3),(9,'pan_tilt','Xoay quét','Ngang 360°, dọc 80°',4),(9,'night_distance_m','Tầm nhìn đêm (m)','30',5),(9,'ai_detection','AI','Phát hiện người, theo dõi chuyển động',6),
(10,'resolution_mp','Độ phân giải (MP)','4',1),(10,'resolution','Độ phân giải','2560×1440 (2K)',2),(10,'ip_rating','Chống nước bụi','IP66',3),(10,'pan_tilt','Xoay quét','Ngang 355°, dọc 90°',4),(10,'night_distance_m','Tầm nhìn đêm (m)','30',5),(10,'connectivity','Kết nối','WiFi, LAN',6),
(11,'resolution_mp','Độ phân giải (MP)','2',1),(11,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(11,'ip_rating','Chống nước bụi','IP67',3),(11,'night_distance_m','Tầm nhìn đêm (m)','30',4),(11,'connectivity','Kết nối','WiFi 2.4GHz',5),
(12,'resolution_mp','Độ phân giải (MP)','3',1),(12,'resolution','Độ phân giải','2304×1296 (2K)',2),(12,'ip_rating','Chống nước bụi','IP66',3),(12,'night_distance_m','Tầm nhìn đêm (m)','30',4),(12,'connectivity','Kết nối','WiFi, LAN',5),
(13,'resolution_mp','Độ phân giải (MP)','2',1),(13,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(13,'ip_rating','Chống nước bụi','IP67',3),(13,'night_distance_m','Tầm nhìn đêm (m)','30',4),(13,'connectivity','Kết nối','LAN, cấp nguồn PoE',5),(13,'power','Nguồn','PoE hoặc 12V DC',6),
(14,'resolution_mp','Độ phân giải (MP)','2',1),(14,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(14,'ip_rating','Chống nước bụi','IP67',3),(14,'night_distance_m','Tầm nhìn đêm (m)','30',4),(14,'connectivity','Kết nối','LAN, cấp nguồn PoE',5),(14,'power','Nguồn','PoE hoặc 12V DC',6),
(15,'resolution_mp','Độ phân giải (MP)','2',1),(15,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(15,'ip_rating','Chống nước bụi','IP67',3),(15,'night_distance_m','Tầm nhìn đêm (m)','20',4),(15,'connectivity','Kết nối','Analog 4in1 (cần đầu ghi DVR)',5),
(16,'channels','Số kênh','4',1),(16,'poe_ports','Cổng PoE','4',2),(16,'max_hdd','Ổ cứng hỗ trợ','1 ổ, tối đa 8TB',3),(16,'connectivity','Kết nối','LAN, HDMI, VGA',4),
(17,'channels','Số kênh','8',1),(17,'poe_ports','Cổng PoE','8',2),(17,'max_hdd','Ổ cứng hỗ trợ','1 ổ, tối đa 10TB',3),(17,'connectivity','Kết nối','LAN, HDMI, VGA',4),
(18,'channels','Số kênh','4',1),(18,'poe_ports','Cổng PoE','0',2),(18,'max_hdd','Ổ cứng hỗ trợ','1 ổ, tối đa 6TB',3),(18,'connectivity','Kết nối','WiFi, LAN, HDMI',4),
(19,'channels','Số kênh','4',1),(19,'poe_ports','Cổng PoE','0',2),(19,'max_hdd','Ổ cứng hỗ trợ','1 ổ, tối đa 6TB',3),(19,'connectivity','Kết nối','Analog 5in1 + IP, HDMI, VGA',4),
(20,'unlock_methods','Cách mở khóa','Vân tay, mã số, thẻ, chìa cơ, ứng dụng',1),(20,'connectivity','Kết nối','WiFi',2),(20,'battery','Pin','8 pin AA, khoảng 12 tháng',3),(20,'fingerprint_capacity','Số vân tay','100',4),
(21,'unlock_methods','Cách mở khóa','Khuôn mặt 3D, vân tay, mã số, thẻ, chìa cơ, ứng dụng',1),(21,'connectivity','Kết nối','WiFi',2),(21,'battery','Pin','Pin sạc Lithium 8000mAh',3),(21,'camera','Camera','Camera mắt mèo + màn hình trong nhà',4),
(22,'unlock_methods','Cách mở khóa','Vân tay, mã số, thẻ, chìa cơ',1),(22,'battery','Pin','8 pin AA',2),(22,'fingerprint_capacity','Số vân tay','100',3),
(23,'unlock_methods','Cách mở khóa','Vân tay, mã số, NFC, chìa cơ, ứng dụng',1),(23,'connectivity','Kết nối','Bluetooth (WiFi qua gateway)',2),(23,'battery','Pin','8 pin AA, khoảng 12 tháng',3),
(24,'unlock_methods','Cách mở khóa','Vân tay, mã số, thẻ, chìa cơ',1),(24,'battery','Pin','4 pin AA',2),(24,'fingerprint_capacity','Số vân tay','50',3),
(25,'resolution_mp','Độ phân giải (MP)','2',1),(25,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(25,'connectivity','Kết nối','WiFi 2.4GHz',3),(25,'power','Nguồn','Dây chuông 16-24V AC',4),(25,'ip_rating','Chống nước bụi','IP65',5),
(26,'resolution_mp','Độ phân giải (MP)','2',1),(26,'resolution','Độ phân giải','1920×1080 (Full HD)',2),(26,'connectivity','Kết nối','WiFi 2.4GHz',3),(26,'ip_rating','Chống nước bụi','IP65',4),(26,'ai_detection','AI','Phát hiện người',5),
(27,'screen','Màn hình','7 inch trong nhà',1),(27,'connectivity','Kết nối','Dây 2 lõi',2),(27,'ip_rating','Chống nước bụi','IP65 (nút gọi ngoài trời)',3),
(28,'components','Thành phần','Hub, cảm biến cửa, cảm biến chuyển động, còi',1),(28,'connectivity','Kết nối','WiFi + sóng RF 433MHz',2),(28,'siren_db','Âm lượng còi','100dB',3),
(29,'detection_range_m','Khoảng phát hiện (m)','8',1),(29,'connectivity','Kết nối','Zigbee (cần gateway)',2),(29,'battery','Pin','CR123A, khoảng 2 năm',3),
(30,'connectivity','Kết nối','Zigbee (cần gateway Xiaomi)',1),(30,'battery','Pin','CR2032',2),
(31,'siren_db','Âm lượng còi','110dB',1),(31,'connectivity','Kết nối','Zigbee (cần gateway)',2),(31,'power','Nguồn','Pin sạc + cáp USB',3),
(32,'capacity','Dung lượng','64GB',1),(32,'speed','Tốc độ','Class 10, U1, V10',2),
(33,'capacity','Dung lượng','128GB',1),(33,'speed','Tốc độ','Class 10, U1, V10',2),
(34,'capacity','Dung lượng','1TB',1),(34,'interface','Giao tiếp','SATA 6Gb/s, 3.5 inch',2),
(35,'capacity','Dung lượng','2TB',1),(35,'interface','Giao tiếp','SATA 6Gb/s, 3.5 inch',2);

-- ---------------------------------------------------------------------
-- GIỎ HÀNG
-- ---------------------------------------------------------------------
INSERT INTO carts (id, user_id) VALUES (1, 2), (2, 3);
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (1, 12, 1), (1, 33, 1);

-- ---------------------------------------------------------------------
-- ĐƠN HÀNG MẪU (ngày tính lùi từ lúc chạy migration để dashboard có số liệu)
-- ---------------------------------------------------------------------
INSERT INTO orders (id, order_code, user_id, receiver_name, receiver_phone, receiver_email, shipping_address, note,
                    subtotal, shipping_fee, discount, total, payment_method, payment_status, status, cancel_reason, created_at) VALUES
(1, 'SS-DEMO-0001', 2, 'Nguyễn Văn An', '0912345678', 'khachhang1@example.com', '268 Lý Thường Kiệt, Phường 12, Quận 10, TP. Hồ Chí Minh', NULL,
    1110000, 0, 0, 1110000, 'COD', 'PAID', 'COMPLETED', NULL, NOW() - INTERVAL 10 DAY),
(2, 'SS-DEMO-0002', 3, 'Trần Thị Bình', '0987654321', 'khachhang2@example.com', '144 Xuân Thủy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', 'Giao giờ hành chính',
    4050000, 0, 0, 4050000, 'BANK_TRANSFER', 'PAID', 'COMPLETED', NULL, NOW() - INTERVAL 8 DAY),
(3, 'SS-DEMO-0003', 3, 'Trần Thị Bình', '0987654321', 'khachhang2@example.com', '144 Xuân Thủy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', NULL,
    1040000, 0, 0, 1040000, 'COD', 'UNPAID', 'CANCELLED', 'Khách đổi ý, muốn chọn camera ngoài trời', NOW() - INTERVAL 6 DAY),
(4, 'SS-DEMO-0004', 2, 'Nguyễn Văn An', '0912345678', 'khachhang1@example.com', '268 Lý Thường Kiệt, Phường 12, Quận 10, TP. Hồ Chí Minh', 'Cần lắp đặt tận nơi',
    7990000, 0, 0, 7990000, 'BANK_TRANSFER', 'PAID', 'SHIPPING', NULL, NOW() - INTERVAL 4 DAY),
(5, 'SS-DEMO-0005', 3, 'Trần Thị Bình', '0987654321', 'khachhang2@example.com', '144 Xuân Thủy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', 'Lắp cho cửa hàng',
    6190000, 0, 0, 6190000, 'COD', 'UNPAID', 'CONFIRMED', NULL, NOW() - INTERVAL 2 DAY),
(6, 'SS-DEMO-0006', 2, 'Nguyễn Văn An', '0912345678', 'khachhang1@example.com', '268 Lý Thường Kiệt, Phường 12, Quận 10, TP. Hồ Chí Minh', NULL,
    1690000, 30000, 0, 1720000, 'COD', 'UNPAID', 'PENDING', NULL, NOW() - INTERVAL 2 HOUR);

INSERT INTO order_items (order_id, product_id, product_name, product_sku, product_thumbnail, unit_price, quantity, line_total) VALUES
(1, 2,  'Camera WiFi Ezviz C6 4MP 2K xoay 360°',            'EZ-C6-4MP',        '/images/products/ezviz-c6.jpg',      890000,  1, 890000),
(1, 32, 'Thẻ nhớ Kingston High Endurance 64GB',             'KS-HE-64',         '/images/products/kingston-64.jpg',   220000,  1, 220000),
(2, 9,  'Camera WiFi ngoài trời Ezviz H8C 4MP xoay 360°',   'EZ-H8C-4MP',       '/images/products/ezviz-h8c.jpg',     1350000, 2, 2700000),
(2, 34, 'Ổ cứng WD Purple 1TB chuyên camera',               'WD-PURPLE-1TB',    '/images/products/wd-purple-1tb.jpg', 1350000, 1, 1350000),
(3, 5,  'Camera WiFi TP-Link Tapo C200 2MP',                'TP-C200',          '/images/products/tapo-c200.jpg',     520000,  2, 1040000),
(4, 20, 'Khóa cửa vân tay Philips Easykey 9300',            'PH-9300',          '/images/products/philips-9300.jpg',  7990000, 1, 7990000),
(5, 16, 'Đầu ghi IP Hikvision DS-7104NI-Q1/4P 4 kênh PoE',  'HIK-7104NI-Q1-4P', '/images/products/hik-nvr-7104.jpg',  2390000, 1, 2390000),
(5, 13, 'Camera IP PoE Hikvision DS-2CD1023G0E-I 2MP',      'HIK-1023G0E-I',    '/images/products/hik-1023.jpg',      950000,  4, 3800000),
(6, 25, 'Chuông cửa có hình WiFi Ezviz DB1C',               'EZ-DB1C',          '/images/products/ezviz-db1c.jpg',    1690000, 1, 1690000);

INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note, created_at) VALUES
(1, NULL,        'PENDING',   2, 'Khách đặt hàng',          NOW() - INTERVAL 10 DAY),
(1, 'PENDING',   'CONFIRMED', 1, NULL,                      NOW() - INTERVAL 10 DAY + INTERVAL 1 HOUR),
(1, 'CONFIRMED', 'SHIPPING',  1, NULL,                      NOW() - INTERVAL 9 DAY),
(1, 'SHIPPING',  'COMPLETED', 1, 'Đã giao, thu tiền COD',   NOW() - INTERVAL 7 DAY),
(2, NULL,        'PENDING',   3, 'Khách đặt hàng',          NOW() - INTERVAL 8 DAY),
(2, 'PENDING',   'CONFIRMED', 4, 'Đã nhận chuyển khoản',    NOW() - INTERVAL 8 DAY + INTERVAL 3 HOUR),
(2, 'CONFIRMED', 'SHIPPING',  4, NULL,                      NOW() - INTERVAL 7 DAY),
(2, 'SHIPPING',  'COMPLETED', 4, NULL,                      NOW() - INTERVAL 5 DAY),
(3, NULL,        'PENDING',   3, 'Khách đặt hàng',          NOW() - INTERVAL 6 DAY),
(3, 'PENDING',   'CANCELLED', 3, 'Khách tự hủy',            NOW() - INTERVAL 6 DAY + INTERVAL 2 HOUR),
(4, NULL,        'PENDING',   2, 'Khách đặt hàng',          NOW() - INTERVAL 4 DAY),
(4, 'PENDING',   'CONFIRMED', 1, 'Hẹn lắp đặt',             NOW() - INTERVAL 4 DAY + INTERVAL 2 HOUR),
(4, 'CONFIRMED', 'SHIPPING',  1, NULL,                      NOW() - INTERVAL 1 DAY),
(5, NULL,        'PENDING',   3, 'Khách đặt hàng',          NOW() - INTERVAL 2 DAY),
(5, 'PENDING',   'CONFIRMED', 4, NULL,                      NOW() - INTERVAL 1 DAY),
(6, NULL,        'PENDING',   2, 'Khách đặt hàng',          NOW() - INTERVAL 2 HOUR);

INSERT INTO product_reviews (product_id, user_id, order_id, rating, comment, created_at) VALUES
(2,  2, 1, 5, 'Hình 2K rất nét, cài qua app Ezviz chưa tới 5 phút.', NOW() - INTERVAL 6 DAY),
(9,  3, 2, 4, 'Quay đêm có màu đẹp, chỉ tiếc app hơi nhiều quảng cáo.', NOW() - INTERVAL 4 DAY),
(34, 3, 2, 5, 'Ổ cứng chạy êm, lắp vào đầu ghi nhận ngay.', NOW() - INTERVAL 4 DAY);

INSERT INTO email_logs (to_email, subject, template, related_order_id, status, sent_at, created_at) VALUES
('khachhang1@example.com', '[SecureShop] Xác nhận đơn hàng SS-DEMO-0001', 'order-confirmation', 1, 'SENT', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY),
('admin@secureshop.vn',    '[SecureShop] Đơn hàng mới SS-DEMO-0001',      'new-order-admin',    1, 'SENT', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY),
('khachhang2@example.com', '[SecureShop] Xác nhận đơn hàng SS-DEMO-0002', 'order-confirmation', 2, 'SENT', NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 8 DAY),
('khachhang1@example.com', '[SecureShop] Đơn SS-DEMO-0004 đang được giao','order-status-changed',4, 'SENT', NOW() - INTERVAL 1 DAY,  NOW() - INTERVAL 1 DAY),
('khachhang1@example.com', '[SecureShop] Xác nhận đơn hàng SS-DEMO-0006', 'order-confirmation', 6, 'FAILED', NULL,               NOW() - INTERVAL 2 HOUR);

UPDATE email_logs SET error_message = 'Ví dụ lỗi: 535 Authentication failed (sai App Password)', retry_count = 3
WHERE related_order_id = 6;

-- ---------------------------------------------------------------------
-- HỘI THOẠI, TIN NHẮN, CUỘC GỌI
-- ---------------------------------------------------------------------
INSERT INTO conversations (id, customer_id, admin_id, status, ai_summary, unread_customer, unread_admin, last_message_at, created_at, closed_at) VALUES
(1, 2, 1, 'CLOSED',
    'Khách cần camera trong nhà quan sát phòng khách khoảng 25m², ngân sách dưới 1 triệu, muốn xem rõ ban đêm.',
    0, 0, NOW() - INTERVAL 11 DAY + INTERVAL 20 MINUTE, NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 11 DAY + INTERVAL 30 MINUTE),
(2, 3, NULL, 'WAITING',
    'Khách mở cửa hàng khoảng 60m², cần 4 camera có đầu ghi, muốn hỏi chi phí lắp đặt tận nơi tại Hà Nội.',
    0, 2, NOW() - INTERVAL 15 MINUTE, NOW() - INTERVAL 25 MINUTE, NULL);

INSERT INTO messages (conversation_id, sender_id, sender_type, type, content, product_id, created_at) VALUES
(1, 2,    'CUSTOMER', 'TEXT',         'Shop tư vấn giúp mình camera cho phòng khách, tầm dưới 1 triệu', NULL, NOW(3) - INTERVAL 11 DAY),
(1, NULL, 'AI',       'TEXT',         'Dạ, phòng khách của anh/chị rộng khoảng bao nhiêu m² và có cần xoay 360° không ạ?', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 10 SECOND),
(1, 2,    'CUSTOMER', 'TEXT',         'Khoảng 25m², cần xoay được', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 40 SECOND),
(1, NULL, 'AI',       'PRODUCT_CARD', 'Mẫu này xoay 360°, độ phân giải 2K, phù hợp phòng 25m²:', 2, NOW(3) - INTERVAL 11 DAY + INTERVAL 45 SECOND),
(1, 2,    'CUSTOMER', 'TEXT',         'Cho mình gặp nhân viên tư vấn để xem thử hình ban đêm', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 2 MINUTE),
(1, NULL, 'SYSTEM',   'TEXT',         'Đã chuyển cuộc trò chuyện tới tư vấn viên.', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 2 MINUTE),
(1, 1,    'ADMIN',    'TEXT',         'Chào anh An, em gọi video để anh xem trực tiếp hình ban đêm của C6 nhé.', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 4 MINUTE),
(1, NULL, 'SYSTEM',   'CALL_LOG',     'Cuộc gọi video 4 phút 12 giây', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 10 MINUTE),
(1, 1,    'ADMIN',    'PRODUCT_CARD', 'Anh nên lấy thêm thẻ nhớ 64GB để lưu khoảng 10 ngày:', 32, NOW(3) - INTERVAL 11 DAY + INTERVAL 11 MINUTE),
(1, 2,    'CUSTOMER', 'TEXT',         'Ok, mình đặt luôn. Cảm ơn shop!', NULL, NOW(3) - INTERVAL 11 DAY + INTERVAL 20 MINUTE),
(2, 3,    'CUSTOMER', 'TEXT',         'Mình mở shop quần áo khoảng 60m², cần lắp camera', NULL, NOW(3) - INTERVAL 25 MINUTE),
(2, NULL, 'AI',       'TEXT',         'Với cửa hàng 60m², thường cần 3-4 camera kèm đầu ghi để lưu trữ dài ngày. Bộ gợi ý:', NULL, NOW(3) - INTERVAL 24 MINUTE),
(2, NULL, 'AI',       'PRODUCT_CARD', 'Đầu ghi 4 kênh có sẵn PoE, chỉ cần 1 dây mạng cho mỗi camera', 16, NOW(3) - INTERVAL 24 MINUTE),
(2, NULL, 'AI',       'PRODUCT_CARD', 'Camera IP PoE 2MP, chống nước, dùng cùng đầu ghi', 13, NOW(3) - INTERVAL 24 MINUTE),
(2, 3,    'CUSTOMER', 'TEXT',         'Bên mình có lắp đặt tận nơi ở Hà Nội không, chi phí bao nhiêu?', NULL, NOW(3) - INTERVAL 16 MINUTE),
(2, NULL, 'SYSTEM',   'TEXT',         'Câu hỏi cần tư vấn viên. Đang chờ tư vấn viên nhận cuộc trò chuyện…', NULL, NOW(3) - INTERVAL 15 MINUTE);

INSERT INTO call_logs (conversation_id, caller_id, callee_id, call_type, status, started_at, answered_at, ended_at, duration_seconds) VALUES
(1, 1, 2, 'VIDEO', 'ENDED',
    NOW() - INTERVAL 11 DAY + INTERVAL 5 MINUTE,
    NOW() - INTERVAL 11 DAY + INTERVAL 5 MINUTE + INTERVAL 8 SECOND,
    NOW() - INTERVAL 11 DAY + INTERVAL 9 MINUTE + INTERVAL 20 SECOND,
    252);

-- ---------------------------------------------------------------------
-- LOG AI (ví dụ cho trang đánh giá model / gán nhãn lại)
-- ---------------------------------------------------------------------
INSERT INTO ai_chat_logs (conversation_id, user_id, session_id, user_message, predicted_intent, confidence, entities, bot_reply, suggested_product_ids, handed_off, feedback, corrected_intent, model_version, response_ms, created_at) VALUES
(1, 2, NULL, 'Shop tư vấn giúp mình camera cho phòng khách, tầm dưới 1 triệu',
    'tu_van_camera', 0.9612, JSON_OBJECT('device', 'camera', 'placement', 'INDOOR', 'budget_max', 1000000),
    'Dạ, phòng khách của anh/chị rộng khoảng bao nhiêu m² và có cần xoay 360° không ạ?', JSON_ARRAY(), FALSE, 'GOOD', NULL, 'phobert-v1', 85, NOW() - INTERVAL 11 DAY),
(1, 2, NULL, 'Khoảng 25m², cần xoay được',
    'cung_cap_thong_tin', 0.8840, JSON_OBJECT('area_m2', 25, 'pan_tilt', TRUE),
    'Mẫu này xoay 360°, độ phân giải 2K, phù hợp phòng 25m²', JSON_ARRAY(2), FALSE, 'GOOD', NULL, 'phobert-v1', 92, NOW() - INTERVAL 11 DAY + INTERVAL 40 SECOND),
(1, 2, NULL, 'Cho mình gặp nhân viên tư vấn để xem thử hình ban đêm',
    'gap_nhan_vien', 0.9734, JSON_OBJECT(), 'Đã chuyển cuộc trò chuyện tới tư vấn viên.', JSON_ARRAY(), TRUE, NULL, NULL, 'phobert-v1', 70, NOW() - INTERVAL 11 DAY + INTERVAL 2 MINUTE),
(2, 3, NULL, 'Mình mở shop quần áo khoảng 60m², cần lắp camera',
    'tu_van_camera', 0.9321, JSON_OBJECT('device', 'camera', 'location_type', 'cua_hang', 'area_m2', 60),
    'Với cửa hàng 60m², thường cần 3-4 camera kèm đầu ghi...', JSON_ARRAY(16, 13), FALSE, NULL, NULL, 'phobert-v1', 110, NOW() - INTERVAL 24 MINUTE),
(2, 3, NULL, 'Bên mình có lắp đặt tận nơi ở Hà Nội không, chi phí bao nhiêu?',
    'hoi_lap_dat', 0.6105, JSON_OBJECT('city', 'Hà Nội'), 'Câu hỏi cần tư vấn viên.', JSON_ARRAY(), TRUE, NULL, NULL, 'phobert-v1', 78, NOW() - INTERVAL 16 MINUTE),
(NULL, NULL, 'guest-7f3a9c', 'khoá vân tay nào chống nước',
    'hoi_gia', 0.4470, JSON_OBJECT('device', 'khoa_van_tay'), 'Bạn muốn hỏi giá sản phẩm nào ạ?', JSON_ARRAY(), FALSE, 'BAD', 'tu_van_khoa', 'phobert-v1', 66, NOW() - INTERVAL 3 DAY);
