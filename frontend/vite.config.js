import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Máy khác trong mạng LAN mở http://<IP máy này>:5173.
 * Trình duyệt chỉ gọi "/api/...", Vite chuyển tiếp sang backend Spring Boot (mặc định cổng 8081).
 * => Máy thứ 2 không cần biết địa chỉ backend, cũng không bị lỗi CORS.
 *
 * Muốn trỏ sang backend khác (vd. bản chạy thử cổng 8082): đặt biến môi trường BACKEND_URL=http://localhost:8082
 *
 * GỌI VIDEO GIỮA 2 MÁY: trình duyệt chỉ cho bật camera/micro trên HTTPS (hoặc localhost).
 * Đặt HTTPS=1 (file start-demo-2-may.bat làm sẵn) -> Vite chạy https://<IP>:5173 với chứng chỉ tự ký.
 * Lần đầu mở, trình duyệt cảnh báo "không riêng tư": bấm Nâng cao -> Tiếp tục truy cập.
 */
const backend = process.env.BACKEND_URL || 'http://localhost:8081';
const useHttps = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl({ name: 'secureshop-dev' })] : [])],
  server: {
    port: 5173,
    host: true, // lắng nghe trên mọi card mạng để laptop khác truy cập được
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        // Gửi kèm IP thật của trình duyệt (X-Forwarded-For) để backend giới hạn số lần đăng nhập sai theo từng máy
        xfwd: true,
        // Request đi qua proxy là cùng nguồn, bỏ header Origin để Spring không xử lý như CORS
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
      // Chat realtime + signaling gọi video (WebSocket)
      '/ws': {
        target: backend.replace(/^http/, 'ws'),
        ws: true,
        changeOrigin: true,
        // Giống /api: bỏ header Origin. Nếu không, mở web bằng IP (laptop thứ 2, vd. https://192.168.1.5:5173)
        // thì Spring Security coi là gọi từ trang lạ -> từ chối bắt tay WebSocket (403), chat realtime + gọi video hỏng.
        // An toàn vì kết nối vẫn phải gửi JWT hợp lệ trong khung STOMP CONNECT.
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
});
