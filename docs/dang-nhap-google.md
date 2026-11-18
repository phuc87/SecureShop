# Bật "Đăng nhập với Google"

Code đã có sẵn. Chỉ cần tạo **Client ID** trên Google rồi điền vào `backend/secrets.properties`.
Chưa điền thì nút Google tự ẩn, web vẫn chạy bình thường.

## 1. Tạo Client ID (làm 1 lần, miễn phí)

1. Vào https://console.cloud.google.com và đăng nhập Gmail của bạn.
2. Góc trên bên trái, bấm chọn project → **New Project** → đặt tên `SecureShop` → **Create**.
3. Menu ☰ → **APIs & Services** → **OAuth consent screen**:
   - User type: **External** → **Create**.
   - App name: `SecureShop`, User support email: Gmail của bạn, Developer contact: Gmail của bạn → **Save and continue** đến hết.
   - Ở mục **Audience / Publishing status** bấm **Publish app** để ai cũng đăng nhập được.
     Nếu để chế độ *Testing*, chỉ các Gmail được thêm vào **Test users** mới đăng nhập được.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, Name: `SecureShop Web`.
   - **Authorized JavaScript origins**, bấm *Add URI* và thêm cả 2 dòng:
     ```
     http://localhost:5173
     https://localhost:5173
     ```
   - Authorized redirect URIs: **để trống**.
   - Bấm **Create**, rồi copy **Client ID** (dạng `123456789-abc....apps.googleusercontent.com`).

## 2. Điền vào dự án

Mở `backend/secrets.properties`, thêm dòng:
```
GOOGLE_CLIENT_ID=123456789-abc....apps.googleusercontent.com
```
Khởi động lại backend (đóng cửa sổ Backend, chạy lại `start-backend.bat` hoặc `start-all.bat`).
Trang **Đăng nhập** và **Đăng ký** sẽ hiện nút **Đăng nhập bằng Google**.

Client ID **không phải bí mật** (trình duyệt nào cũng thấy). Không cần và **không được** dùng *Client secret*.

## 3. Cách hoạt động

```
Trình duyệt ── bấm nút Google ──► Google (popup đăng nhập)
           ◄── ID token (JWT do Google ký) ──
           ── POST /api/auth/google {credential} ──► Backend
                                                     ├─ tải khoá công khai của Google (JWKS), kiểm tra chữ ký RS256
                                                     ├─ iss = accounts.google.com, aud = Client ID của shop, còn hạn
                                                     ├─ email đã được Google xác minh
                                                     └─ email đã có tài khoản -> đăng nhập; chưa có -> tạo tài khoản KHÁCH HÀNG
           ◄── JWT của SecureShop (giống đăng nhập thường) ──
```

- Code: `backend/.../security/GoogleTokenVerifier.java`, `AuthService.loginWithGoogle`, `frontend/src/components/auth/GoogleButton.jsx`.
- Kiểm thử: `backend/src/test/.../GoogleTokenVerifierTest.java` (11 ca: chữ ký giả, sai website, hết hạn...)
  và `AuthServiceGoogleTest.java` (6 ca). Chạy: `cd backend` rồi `mvn test`.

## Lưu ý

- **Tài khoản tạo bằng Google** không có mật khẩu. Muốn đăng nhập bằng mật khẩu thì dùng **Quên mật khẩu** để đặt.
- **Đã có tài khoản cùng email** (kể cả admin): đăng nhập Google sẽ vào **đúng tài khoản đó**, giữ nguyên vai trò.
- Google **không cho dùng trên địa chỉ IP** (vd. laptop 2 mở `https://192.168.1.8:5173`), nên lúc đó nút tự ẩn,
  laptop 2 đăng nhập bằng email/mật khẩu. Muốn dùng Google trên mọi máy thì phải đưa web lên **tên miền thật**.
- Máy chạy backend cần **có Internet** để tải khoá công khai của Google.
