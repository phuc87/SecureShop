# Phân quyền SecureShop

Hệ thống có 2 vai trò lưu trong cột `users.role`, cộng với khách chưa đăng nhập:

| Vai trò | Là ai | Cách có |
|---|---|---|
| **Khách vãng lai** | Người chưa đăng nhập | Mặc định |
| **CUSTOMER** (Khách hàng) | Người mua hàng | Tự đăng ký trên web |
| **ADMIN** (Quản trị viên) | Chủ cửa hàng, nhân viên tư vấn | Admin khác cấp quyền trong trang Người dùng (đăng ký công khai không bao giờ tạo ra ADMIN) |

## Bảng quyền theo chức năng

| Chức năng | Khách vãng lai | CUSTOMER | ADMIN |
|---|:-:|:-:|:-:|
| Xem, tìm kiếm, lọc sản phẩm | ✅ | ✅ | ✅ |
| Hỏi trợ lý AI (tab Trợ lý AI trong khung chat) | ✅ | ✅ + xem đơn hàng, chuyển tư vấn viên | ❌ (không hiện khung chat) |
| Xem thống kê AI, gán nhãn, dạy lại AI | ❌ | ❌ | ✅ |
| Thêm vào giỏ hàng | ✅ (lưu trên trình duyệt) | ✅ | ❌ |
| Đặt hàng, xem đơn của mình | ❌ (phải đăng nhập) | ✅ chỉ đơn của mình | ❌ |
| Chat, gọi video với tư vấn viên | ❌ | ✅ gửi yêu cầu | ✅ nhận và trả lời |
| Xem toàn bộ đơn hàng, đổi trạng thái đơn | ❌ | ❌ | ✅ |
| Thêm, sửa, ẩn sản phẩm | ❌ | ❌ | ✅ |
| Xem danh sách người dùng | ❌ | ❌ | ✅ |
| Khoá / mở khoá tài khoản | ❌ | ❌ | ✅ (trừ chính mình) |
| Đổi vai trò người dùng | ❌ | ❌ | ✅ (trừ chính mình) |
| Quên mật khẩu (nhận link qua email) | ✅ | (đăng nhập rồi thì dùng Đổi mật khẩu) | ✅ |
| Sản phẩm yêu thích (bấm trái tim) | ❌ bấm sẽ được mời đăng nhập | ✅ chỉ danh sách của mình | ❌ (không hiện nút) |
| Viết đánh giá sản phẩm | ❌ | ✅ chỉ sản phẩm đã mua, đơn đã **Hoàn thành**, mỗi đơn 1 lần | ❌ |
| Xoá đánh giá | ❌ | ❌ | ✅ |
| Thêm, sửa, xoá danh mục & thương hiệu | ❌ | ❌ | ✅ (chỉ xoá khi không còn sản phẩm) |
| Gửi lại email đơn hàng cho khách | ❌ | ❌ | ✅ |

**Vì sao ADMIN không mua hàng?** Admin là tài khoản nhân viên. Tách riêng giúp số liệu doanh thu và đơn hàng không bị lẫn đơn thử của nhân viên, và tránh nhân viên tự duyệt đơn của chính mình.

## Kiểm tra quyền ở đâu

Quyền được kiểm tra ở **backend**. Frontend chỉ ẩn nút và chặn trang cho dễ dùng; ai gọi thẳng API bằng Postman vẫn bị backend chặn.

| Lớp | File | Việc làm |
|---|---|---|
| 1. Theo đường dẫn API | `backend/.../config/SecurityConfig.java` | `/api/admin/**` chỉ ADMIN; `/api/cart/**`, `/api/orders/**`, `/api/favorites/**` chỉ CUSTOMER; GET sản phẩm công khai |
| 2. Theo controller | `@PreAuthorize("hasRole('ADMIN')")` trên các controller admin | Chặn lần 2 phòng khi cấu hình URL bị sửa nhầm |
| 3. Theo dữ liệu | Service (ví dụ `OrderService`) | Khách chỉ xem/sửa đơn có `user_id` = chính mình (làm ở bước đặt hàng) |
| 4. Quy tắc nghiệp vụ | `AdminUserService` | Admin không tự khoá / tự hạ quyền chính mình, nên luôn còn ít nhất 1 admin |
| Giao diện | `frontend/src/routes/guards.jsx` | `AdminRoute`, `ShopperRoute`, `PrivateRoute`, `GuestOnlyRoute` |

## Hiệu lực ngay lập tức

JWT chỉ chứa `userId`. Mỗi request, `JwtAuthFilter` tải lại người dùng từ database, nên:

- **Bị khoá:** request tiếp theo trả về **401**, frontend tự đăng xuất.
- **Bị đổi vai trò:** request tiếp theo dùng vai trò mới. Ví dụ bị hạ từ ADMIN xuống CUSTOMER thì gọi API admin bị **403**, frontend tải lại thông tin và đưa người đó ra khỏi trang quản trị.

## Mã lỗi

| Mã | Ý nghĩa | Ví dụ |
|---|---|---|
| 401 | Chưa đăng nhập, token sai hoặc hết hạn, tài khoản bị khoá | Gọi `/api/auth/me` không kèm token |
| 403 | Đã đăng nhập nhưng không đủ quyền | CUSTOMER gọi `/api/admin/users`; ADMIN gọi `/api/cart` |
| 400 | Vi phạm quy tắc | Admin tự khoá chính mình |
| 409 | Trùng dữ liệu / còn ràng buộc | Thêm danh mục trùng tên; xoá thương hiệu còn sản phẩm; đánh giá 2 lần cùng đơn |
| 429 | Thao tác quá nhiều lần | Đăng nhập sai 5 lần / 15 phút (theo email) hoặc 20 lần / 15 phút (theo IP) -> khoá tạm 15 phút |
