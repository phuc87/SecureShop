"""Nạp model đã train và dự đoán ý định cho 1 câu."""
import threading

import joblib

from .text import normalize
from .training import MODEL_PATH


class IntentModel:
    """Bọc model để có thể thay model khác (PhoBERT...) mà không đổi API: chỉ cần predict_proba + classes_."""

    def __init__(self):
        self._lock = threading.Lock()
        self.pipeline = None
        self.metrics = {}
        self.reload()

    def reload(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Chưa có model {MODEL_PATH}. Chạy: python train_intent.py")
        bundle = joblib.load(MODEL_PATH)
        with self._lock:
            self.pipeline = bundle["pipeline"]
            self.metrics = bundle.get("metrics", {})

    @property
    def version(self):
        return self.metrics.get("version", "unknown")

    def predict(self, text: str, top_k: int = 3):
        """-> (intent, confidence, [(intent, prob)...] top_k)"""
        with self._lock:
            pipeline = self.pipeline
        probs = pipeline.predict_proba([normalize(text)])[0]
        ranked = sorted(zip(pipeline.classes_, probs), key=lambda x: x[1], reverse=True)
        best, conf = ranked[0]
        return best, float(conf), [(c, float(p)) for c, p in ranked[:top_k]]
