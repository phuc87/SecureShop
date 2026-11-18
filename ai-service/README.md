# SecureShop AI service

Trợ lý tư vấn thiết bị an ninh. Service Python này chỉ làm phần **hiểu câu hỏi**:

| Việc | Cách làm | File |
|---|---|---|
| Chuẩn hoá tiếng Việt (bỏ dấu, viết tắt "k", "ko", "1tr5", "cam"...) | Luật | `app/text.py` |
| **Ý định** (intent): khách muốn gì? | Model học máy: TF-IDF + Logistic Regression | `app/training.py`, `data/intents.json` |
| **Thông tin** (entities): thiết bị, trong/ngoài trời, ngân sách, hãng, tính năng... | Luật + từ điển | `app/entities.py` |

Phần **trả lời** (tìm sản phẩm thật trong DB, chấm điểm theo tính năng, nhớ ngữ cảnh nhiều câu, chuyển tư vấn viên,
lưu lịch sử `ai_chat_logs`) do backend Spring Boot làm: `backend/.../ai/AiAssistantService.java`.

```
Khách ──► Spring Boot /api/ai/ask ──► ai-service /predict ──► {intent, confidence, entities}
                 │  ghép ngữ cảnh các câu trước, tìm & chấm điểm sản phẩm trong MySQL
                 ▼
      Câu trả lời + thẻ sản phẩm + nút gợi ý ──► lưu ai_chat_logs (làm dữ liệu train sau này)
```

## Chạy

Bấm đúp `start-ai.bat` ở thư mục gốc dự án (`start-all.bat` cũng tự mở).
Lần đầu tự tạo môi trường `.venv`, cài thư viện và train model. Tài liệu API: http://127.0.0.1:8000/docs

| API | Dùng để |
|---|---|
| `GET /health` | Trạng thái, phiên bản model, độ chính xác |
| `POST /predict` `{text}` | Phân tích 1 câu |
| `GET /intents` | Danh sách intent (trang quản trị dùng để gán nhãn) |
| `GET /metrics` | F1 từng intent, các câu còn nhầm |
| `POST /retrain` `{examples:[{text,intent}]}` | Thêm câu đã gán nhãn rồi train lại (nút "Dạy lại AI") |

Mọi API (trừ `/health`) cần header `X-AI-Key`, khớp `app.ai.key` trong `backend/.../application.yml`.
Service chỉ nghe `127.0.0.1`, máy khác không gọi thẳng được.

## Train

```
cd ai-service
.venv\Scripts\python train_intent.py
```

In ra **độ chính xác theo kiểm định chéo 5 phần**: mỗi câu được chấm bởi một model **chưa từng học câu đó**,
nên con số phản ánh đúng khả năng với câu mới. Ngoài ra còn in F1 từng intent và các câu còn nhầm.

Kết quả thử nghiệm khi làm đồ án (cùng thuật toán, chỉ thay đổi lượng dữ liệu):

| Dữ liệu | Độ chính xác | Macro F1 |
|---|---|---|
| 377 câu (~23 câu / intent) | 69,8% | 0,69 |
| 621 câu (~39 câu / intent) | 82,0% | 0,82 |

Thử đổi thuật toán (SVM, tham số khác, sinh thêm câu tự động) thì độ chính xác chỉ chênh ±1–2%.
Như vậy **giới hạn nằm ở lượng dữ liệu**, không nằm ở thuật toán.

### Thêm dữ liệu

1. **Sửa trực tiếp** `data/intents.json`: thêm câu vào `examples` của intent tương ứng (có dấu, không dấu, viết tắt đều được).
2. **Từ thực tế:** vào trang quản trị **Trợ lý AI**, lọc "Bị chê 👎" hoặc "AI không chắc", chọn **nhãn đúng**, rồi bấm **Dạy lại AI**.
   Các câu này được lưu ở `data/extra_examples.json` và cộng vào mỗi lần train. Câu khách bấm 👍 cũng được dùng.
3. Muốn thêm intent mới: thêm 1 mục vào `data/intents.json` (khoảng 30 câu trở lên), train lại,
   rồi thêm cách trả lời trong `AiAssistantService.java` (`switch (intent)`).

## Thay bằng model khác (vd. PhoBERT)

Backend chỉ cần `/predict` trả đúng định dạng `{intent, confidence, top, entities, model_version}`.
Để thay model:

1. Tải dữ liệu train ở trang quản trị (**Tải dữ liệu train (CSV)**) và gộp với `data/intents.json`.
2. Fine-tune PhoBERT (`vinai/phobert-base`, tách từ bằng `pyvi` hoặc VnCoreNLP) cho bài toán phân loại 16 lớp.
3. Viết lớp mới thay `IntentModel` trong `app/intent_model.py`, giữ nguyên hàm `predict(text) -> (intent, confidence, top)`.
4. Giữ `app/entities.py` (luật cho số tiền, thương hiệu, mã sản phẩm vẫn chính xác), hoặc thay bằng model NER
   nhưng trả về cùng các khoá: `device, placement, budget_min, budget_max, brand, features, ...`.

Không phải sửa gì ở backend và giao diện.
