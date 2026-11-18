"""SecureShop AI service (FastAPI, cổng 8000).

Chỉ làm phần HIỂU câu hỏi: ý định (intent) + thông tin (entities).
Phần TRẢ LỜI (tìm sản phẩm trong DB, soạn câu, lưu lịch sử) do backend Spring Boot làm.
Chỉ backend được gọi (header X-AI-Key), service chỉ nghe 127.0.0.1.

Chạy: start-ai.bat (thư mục gốc dự án) hoặc
      .venv\\Scripts\\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Tài liệu API tự sinh: http://127.0.0.1:8000/docs
"""
import os
import time

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from . import training
from .entities import extract
from .intent_model import IntentModel
from .text import normalize

API_KEY = os.environ.get("AI_API_KEY", "secureshop-ai-dev-key")

app = FastAPI(title="SecureShop AI", version="1.0",
              description="Phân loại ý định + trích xuất thông tin cho trợ lý tư vấn thiết bị an ninh")
model = IntentModel()


def require_key(x_ai_key: str = Header(default="")):
    if x_ai_key != API_KEY:
        raise HTTPException(status_code=401, detail="Sai X-AI-Key")


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class Example(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    intent: str


class RetrainRequest(BaseModel):
    examples: list[Example] = []


@app.get("/health")
def health():
    m = model.metrics
    return {"status": "ok", "model_version": model.version, "trained_at": m.get("trained_at"),
            "accuracy": m.get("accuracy"), "macro_f1": m.get("macro_f1"), "examples": m.get("examples"),
            "extra_examples": m.get("extra_examples"), "intents": m.get("intents")}


@app.get("/intents", dependencies=[Depends(require_key)])
def intents():
    return [{"intent": k, "description": v.get("description", ""), "examples": len(v["examples"])}
            for k, v in training.load_intents().items()]


@app.post("/predict", dependencies=[Depends(require_key)])
def predict(req: PredictRequest):
    started = time.perf_counter()
    intent, confidence, top = model.predict(req.text)
    return {
        "intent": intent,
        "confidence": round(confidence, 4),
        "top": [{"intent": i, "confidence": round(p, 4)} for i, p in top],
        "entities": extract(req.text),
        "normalized": normalize(req.text),
        "model_version": model.version,
        "ms": round((time.perf_counter() - started) * 1000, 1),
    }


@app.get("/metrics", dependencies=[Depends(require_key)])
def metrics():
    return model.metrics


@app.post("/retrain", dependencies=[Depends(require_key)])
def retrain(req: RetrainRequest):
    """Thêm câu đã sửa nhãn vào dữ liệu, train lại và dùng model mới ngay (không cần khởi động lại)."""
    added = training.save_extra([e.model_dump() for e in req.examples])
    result = training.train(verbose=False)
    model.reload()
    return {"added": added, **{k: result[k] for k in ("version", "examples", "extra_examples", "accuracy", "macro_f1")}}
