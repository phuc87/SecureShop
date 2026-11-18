"""Huấn luyện model phân loại ý định (intent).

Model nền (baseline): TF-IDF + Logistic Regression.
 - TF-IDF theo TỪ (1-2 từ liền nhau): bắt cụm "bao nhieu", "giao hang", "bao hanh"...
 - TF-IDF theo KÝ TỰ (2-5 ký tự): chịu được gõ sai chính tả, thiếu dấu, viết dính ("baohanh").
 - Logistic Regression: cho ra XÁC SUẤT từng intent -> biết khi nào AI "không chắc" để hỏi lại / chuyển nhân viên.
Đánh giá bằng kiểm định chéo 5 phần (5-fold cross validation): mỗi câu được dự đoán bởi model KHÔNG học câu đó.

Muốn thay bằng PhoBERT: viết model mới có hàm predict_proba giống hệt, giữ nguyên định dạng file .joblib (xem README).
"""
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import FeatureUnion, Pipeline

from .text import normalize

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "data" / "intents.json"
EXTRA = ROOT / "data" / "extra_examples.json"   # câu admin đã sửa nhãn (tạo khi bấm "Dạy lại AI")
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "intent_model.joblib"


def load_intents():
    with open(DATASET, encoding="utf-8") as f:
        return json.load(f)["intents"]


def load_extra():
    if not EXTRA.exists():
        return []
    with open(EXTRA, encoding="utf-8") as f:
        return json.load(f)


def save_extra(new_examples):
    """Gộp câu mới vào extra_examples.json. Trùng câu (sau chuẩn hoá) thì lấy nhãn mới nhất."""
    intents = load_intents()
    merged = {normalize(e["text"]): e for e in load_extra()}
    added = 0
    for e in new_examples:
        text, intent = (e.get("text") or "").strip(), e.get("intent")
        if not text or intent not in intents:
            continue
        key = normalize(text)
        if key not in merged or merged[key]["intent"] != intent:
            added += 1
        merged[key] = {"text": text, "intent": intent}
    EXTRA.parent.mkdir(parents=True, exist_ok=True)
    with open(EXTRA, "w", encoding="utf-8") as f:
        json.dump(list(merged.values()), f, ensure_ascii=False, indent=1)
    return added


def build_dataset():
    texts, labels = [], []
    for intent, info in load_intents().items():
        for ex in info["examples"]:
            texts.append(normalize(ex))
            labels.append(intent)
    for e in load_extra():
        texts.append(normalize(e["text"]))
        labels.append(e["intent"])
    return texts, labels


def build_pipeline():
    features = FeatureUnion([
        ("word", TfidfVectorizer(analyzer="word", ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=1)),
    ])
    clf = LogisticRegression(C=8.0, max_iter=3000, class_weight="balanced")
    return Pipeline([("features", features), ("clf", clf)])


def train(verbose=True):
    texts, labels = build_dataset()
    counts = Counter(labels)
    folds = max(2, min(5, min(counts.values())))

    # 1) Đánh giá: mỗi câu được dự đoán bởi model đã train trên các câu KHÁC
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
    predicted = cross_val_predict(build_pipeline(), texts, labels, cv=cv)
    accuracy = accuracy_score(labels, predicted)
    macro_f1 = f1_score(labels, predicted, average="macro")
    report = classification_report(labels, predicted, output_dict=True, zero_division=0)
    per_intent = {k: round(v["f1-score"], 3) for k, v in report.items() if k in counts}
    mistakes = [{"text": t, "label": y, "predicted": p} for t, y, p in zip(texts, labels, predicted) if y != p]

    # 2) Train lại trên TOÀN BỘ dữ liệu rồi lưu
    pipeline = build_pipeline().fit(texts, labels)
    version = "tfidf-lr-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    metrics = {
        "version": version,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "examples": len(texts),
        "extra_examples": len(load_extra()),
        "intents": len(counts),
        "cv_folds": folds,
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "per_intent_f1": per_intent,
        "mistakes": mistakes[:30],
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "metrics": metrics}, MODEL_PATH)
    with open(MODEL_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    if verbose:
        print(f"Đã train {len(texts)} câu, {len(counts)} intent -> {MODEL_PATH.name} ({version})")
        print(f"Độ chính xác (kiểm định chéo {folds} phần): {accuracy:.1%} | Macro F1: {macro_f1:.3f}")
        print("F1 từng intent:")
        for k, v in sorted(per_intent.items(), key=lambda kv: kv[1]):
            print(f"  {k:<18} {v:.3f}  ({counts[k]} câu)")
        if mistakes:
            print(f"Một số câu còn nhầm ({len(mistakes)}):")
            for m in mistakes[:10]:
                print(f"  '{m['text']}': đúng={m['label']}, đoán={m['predicted']}")
    return metrics
