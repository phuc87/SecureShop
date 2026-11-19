# SecureShop: Website bán thiết bị an ninh tích hợp trợ lý tư vấn AI

Đồ án tốt nghiệp. Website thương mại điện tử bán camera, khoá cửa thông minh, chuông cửa có hình, đầu ghi, cảm biến báo động. Trợ lý AI tư vấn chọn thiết bị và chuyển sang tư vấn viên (chat, gọi video) khi cần.

## Tính năng chính

**Khách hàng**
- Xem, tìm kiếm, lọc sản phẩm (danh mục, thương hiệu, giá, vị trí lắp); trang chi tiết có thông số, đánh giá.
- **So sánh 2 sản phẩm**: bảng thông số đặt cạnh nhau, hệ thống chấm điểm theo tiêu chí có trọng số và đề xuất nên chọn cái nào.
- Giỏ hàng: chọn từng món / chọn tất cả để thanh toán, đồng bộ giá và tồn kho mới nhất.
- Thanh toán: COD hoặc chuyển khoản, **mã giảm giá**, chọn vị trí giao hàng trên **bản đồ OpenStreetMap**.
- Đơn hàng: theo dõi trạng thái, huỷ đơn, email xác nhận; đánh giá sản phẩm sau khi nhận hàng; danh sách yêu thích.
- Tài khoản: đăng ký, đăng nhập (email hoặc **Google**), quên mật khẩu qua email, đổi mật khẩu.
- **Trợ lý AI** tư vấn thiết bị theo nhu cầu (loại thiết bị, ngân sách, trong nhà / ngoài trời) và gợi ý sản phẩm thật.
- **Chat trực tiếp và gọi video** với tư vấn viên (WebSocket + WebRTC).
- Giao diện sáng / tối, responsive cho điện thoại, máy tính bảng, máy tính.

**Quản trị viên**
- Thống kê doanh thu, đơn hàng, sản phẩm bán chạy.
- Quản lý sản phẩm (ảnh, thông số), danh mục, thương hiệu, đơn hàng, người dùng, mã giảm giá, tin nhắn liên hệ.
- Hộp thư chat / gọi video với khách.
- Quản lý trợ lý AI: lịch sử hỏi đáp, độ chính xác, xuất dữ liệu, huấn luyện lại model.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, Leaflet (bản đồ), STOMP (WebSocket), WebRTC |
| Backend | Java 17, Spring Boot 3.5, Spring Security + JWT, Spring Data JPA, WebSocket, JavaMail + Thymeleaf |
| AI service | Python, FastAPI, scikit-learn (TF-IDF + Logistic Regression), trích xuất thông tin bằng luật |
| Database | MariaDB 10.4 (XAMPP) / MySQL |
| Kiểm thử | JUnit 5 + Mockito, kiểm thử giao diện tự động bằng Puppeteer |

Trợ lý AI **tự huấn luyện, chạy trên máy**, không dùng API trả phí bên ngoài. Dữ liệu huấn luyện: `ai-service/data/intents.json`.

## Cấu trúc thư mục

```
SecureShop/
├── frontend/      React + Vite (cổng 5173)
├── backend/       Spring Boot (cổng 8081)
│   └── src/main/resources/db/migration/   các file SQL tạo bảng + dữ liệu mẫu
├── ai-service/    FastAPI + model AI (cổng 8000)
├── database/      hướng dẫn database
├── docs/          tài liệu: phân quyền, gọi video, đăng nhập Google...
└── *.bat          script chạy nhanh trên Windows
```

## Cài đặt và chạy (Windows)

**Cần cài:** JDK 17, Maven, Node.js 20+, Python 3.11+, XAMPP (MySQL).

1. **Database:** mở XAMPP, bật MySQL, vào phpMyAdmin tạo database `secureshop_ai` (collation `utf8mb4_unicode_ci`), rồi import lần lượt các file `V1` → `V9` trong `backend/src/main/resources/db/migration/`. Chi tiết: [database/README.md](database/README.md).
2. **Cấu hình bí mật:** copy `backend/secrets.properties.example` thành `backend/secrets.properties`, điền Gmail + App Password để gửi email (Google Client ID nếu muốn đăng nhập Google). File này **không** được đưa lên Git.
3. **Chạy:** nhấp đúp `start-all.bat` (bật backend, AI service, frontend). Mở http://localhost:5173

Chạy riêng từng phần: `start-backend.bat`, `start-ai.bat`, `start-frontend.bat`.
Demo trên 2 máy cùng mạng (1 máy khách, 1 máy admin): `start-demo-2-may.bat` (bật HTTPS để gọi video), lần đầu chạy `mo-ket-noi-2-may.bat` để mở tường lửa.

## Tài khoản mẫu

| Email | Mật khẩu | Vai trò |
|---|---|---|
| admin@secureshop.vn | Admin@123 | Quản trị viên |
| tuvan@secureshop.vn | Admin@123 | Tư vấn viên (quyền admin) |
| khachhang1@example.com | Customer@123 | Khách hàng |
| khachhang2@example.com | Customer@123 | Khách hàng |

Mã giảm giá mẫu: `CHAOBANMOI`, `GIAM50K`, `ANNINH200`.

## Kiểm thử

```bash
cd backend
mvn test
```

## Tài liệu thêm

- [Phân quyền](docs/phan-quyen.md)
- [Gọi video](docs/goi-video.md)
- [Đăng nhập Google](docs/dang-nhap-google.md)
- [Sao lưu / khôi phục database](backup-database.bat): `backup-database.bat`, `restore-database.bat`
