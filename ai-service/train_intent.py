"""Train model phân loại ý định từ data/intents.json (+ data/extra_examples.json nếu có).

Cách dùng (trong thư mục ai-service):
    .venv\\Scripts\\python train_intent.py
Kết quả: models/intent_model.joblib và models/metrics.json (độ chính xác, F1 từng intent, các câu còn nhầm).
Nếu AI service đang chạy, khởi động lại (hoặc bấm "Dạy lại AI" trong trang quản trị) để dùng model mới.
"""
import sys

from app.training import train

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    train(verbose=True)
