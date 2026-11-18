# Gọi video giữa khách hàng và tư vấn viên

## 1. Cách dùng

| Ai gọi | Bấm ở đâu | Điều kiện |
|---|---|---|
| Khách hàng | Khung chat góc phải → nút camera trên đầu khung | Có ít nhất 1 tư vấn viên đang online và rảnh |
| Tư vấn viên | Hộp thư tư vấn → mở hội thoại → **Gọi video** | Khách đang online (chấm xanh) |

- Bên nhận nghe chuông 30 giây. Nếu không ai bắt máy thì cuộc gọi tính là **nhỡ**.
- Trong lúc gọi có thể tắt/bật mic, tắt/bật camera và đổi camera (điện thoại).
- Tư vấn viên bấm **Thu nhỏ** để vừa gọi vừa nhắn tin, gửi thẻ sản phẩm.
- Kết thúc cuộc gọi thì khung chat có thêm 1 dòng: "Cuộc gọi video · 3 phút 12 giây", "… nhỡ", "… bị từ chối" hoặc "… đã huỷ".

## 2. Chạy demo trên 2 laptop

1. Laptop 1 (máy chạy web): đóng các cửa sổ backend/frontend đang mở rồi chạy **`start-demo-2-may.bat`**.
   File này tự tìm IP WiFi, bật frontend ở chế độ **HTTPS**, và in ra địa chỉ cho laptop 2.
2. Laptop 2 (cùng WiFi): mở `https://<IP laptop 1>:5173`.
   Trình duyệt báo "Kết nối không riêng tư" thì bấm **Nâng cao → Tiếp tục**.
3. Khi gọi, trình duyệt hỏi quyền camera/micro: bấm **Cho phép**.

**Vì sao cần HTTPS?** Trình duyệt chỉ cho trang web dùng camera/micro khi trang chạy trên `https://` hoặc `localhost`. Laptop 2 vào bằng địa chỉ IP nên bắt buộc phải là HTTPS. Chứng chỉ HTTPS do Vite tự tạo (plugin `@vitejs/plugin-basic-ssl`), vì vậy trình duyệt mới cảnh báo.

## 3. Kiến trúc

```
 Trình duyệt A                 Spring Boot (tổng đài)                 Trình duyệt B
 ─────────────                 ──────────────────────                 ─────────────
 POST /api/calls      ───────►  lưu call_logs (RINGING)
                                đổ chuông  ─── /user/queue/call ───►  CALL_RING
                                                                      POST /api/calls/{id}/accept
 CALL_ACCEPTED  ◄── /user/queue/call ───  call_logs (ACCEPTED)
 tạo offer  ── /app/call.signal ──►  chuyển tiếp ── /user/queue/call ─►  tạo answer
 nhận answer ◄────────────────────  chuyển tiếp ◄── /app/call.signal ──
 ICE candidates  ◄═════════════════ chuyển tiếp ═════════════════►  ICE candidates

 ◄═══════════════ HÌNH + TIẾNG ĐI THẲNG GIỮA 2 MÁY (WebRTC, peer-to-peer) ═══════════════►
```

- **Server chỉ làm tổng đài (signaling):** đổ chuông, nhận/từ chối, chuyển tiếp offer/answer/ICE qua WebSocket STOMP.
  Hình và tiếng **không đi qua server** nên không tốn băng thông server và độ trễ thấp.
- **offer/answer (SDP):** mỗi bên mô tả mình gửi được những gì (codec, độ phân giải…).
- **ICE candidate:** các địa chỉ mạng có thể kết nối tới máy đó. Cùng WiFi thì 2 máy kết nối thẳng bằng IP nội bộ.
  Khi có Internet, máy chủ STUN của Google giúp kết nối xuyên qua router.

| Thành phần | File |
|---|---|
| Máy trạng thái cuộc gọi, đổ chuông, hết giờ, lưu DB | `backend/.../service/CallService.java` |
| REST gọi / nghe / từ chối / gác máy | `backend/.../controller/CallController.java` |
| Chuyển tiếp dữ liệu WebRTC | `backend/.../websocket/CallWsController.java` |
| Ai đang online, ai vừa mất kết nối | `backend/.../websocket/PresenceTracker.java` |
| WebRTC phía trình duyệt | `frontend/src/context/CallContext.jsx` |
| Màn hình cuộc gọi | `frontend/src/components/call/CallScreen.jsx` |
| Chuông (Web Audio, không cần file mp3) | `frontend/src/utils/ringtone.js` |

## 4. Các tình huống đã xử lý

| Tình huống | Kết quả |
|---|---|
| Khách gọi mà không có tư vấn viên online | Báo ngay: "Hiện chưa có tư vấn viên rảnh…" |
| Hội thoại đã có người phụ trách | Chỉ đổ chuông người đó. Chưa có ai phụ trách thì đổ chuông mọi tư vấn viên online, người nghe trước sẽ phụ trách |
| Một tư vấn viên nghe máy | Chuông ở các tư vấn viên khác và ở tab khác tự tắt |
| Đang trong cuộc gọi mà có người gọi tới | Tự từ chối ("tư vấn viên đang bận") |
| 30 giây không ai nghe | Cuộc gọi nhỡ |
| Đóng tab, mất mạng giữa cuộc gọi | Bên kia được báo kết thúc. Mạng chập chờn thì chờ 10 giây rồi mới gác máy |
| Máy không có camera / camera đang bận | Tự chuyển sang gọi chỉ có tiếng |
| Chưa cho phép camera/micro | Hướng dẫn bấm biểu tượng ổ khoá để cho phép |
| Server khởi động lại giữa cuộc gọi | Cuộc gọi dở được đánh dấu `FAILED` trong `call_logs` |

## 5. Dữ liệu

- Bảng **`call_logs`**: người gọi, người nghe, trạng thái (`RINGING`, `ACCEPTED`, `REJECTED`, `MISSED`, `ENDED`, `FAILED`), giờ bắt đầu, giờ nghe máy, thời lượng (giây).
- Bảng **`messages`**: mỗi cuộc gọi kết thúc có 1 tin `type = 'CALL_LOG'` trong hội thoại.

```sql
-- Lịch sử cuộc gọi kèm tên người gọi / người nghe
SELECT c.id, ug.full_name AS nguoi_goi, un.full_name AS nguoi_nghe, c.status,
       c.duration_seconds AS so_giay, c.started_at
FROM call_logs c
LEFT JOIN users ug ON ug.id = c.caller_id
LEFT JOIN users un ON un.id = c.callee_id
ORDER BY c.id DESC;
```
