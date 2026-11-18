"""Chuẩn hoá câu tiếng Việt trước khi đưa vào model và bộ trích xuất thông tin.

Khách gõ rất đa dạng: có dấu / không dấu, viết tắt (k, ko, dc, tr, cam...), teencode.
Ta đưa mọi câu về 1 dạng chung: chữ thường, KHÔNG dấu, đã thay viết tắt.
=> "Cam ngoài trời tầm 1tr5 k dây" và "camera ngoai troi tam 1 trieu 5 khong day" gần như giống nhau.
"""
import re
import unicodedata

# Viết tắt / teencode thường gặp (so khớp trên chữ đã bỏ dấu, theo từng từ)
ABBREVIATIONS = {
    "k": "khong", "ko": "khong", "kh": "khong", "hong": "khong", "hok": "khong", "khg": "khong",
    "dc": "duoc", "dk": "duoc",
    "j": "gi", "z": "vay", "v": "vay",
    "mik": "minh", "mk": "minh", "mjk": "minh",
    "bn": "bao nhieu", "bnhieu": "bao nhieu", "nhiu": "nhieu",
    "cam": "camera", "cammera": "camera", "camra": "camera", "came": "camera",
    "sp": "san pham", "sdt": "so dien thoai",
    "ship": "giao hang", "tks": "cam on", "thanks": "cam on", "thank": "cam on", "ty": "cam on",
    "hi": "chao", "hello": "chao", "helo": "chao",
    "oke": "ok", "okie": "ok",
    "nv": "nhan vien", "tvv": "tu van vien",
    "wf": "wifi",
}


def strip_accents(text: str) -> str:
    """'Camera ngoài trời' -> 'Camera ngoai troi' (đ -> d)."""
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def basic(text: str) -> str:
    """Chữ thường + bỏ dấu, KHÔNG tách chữ/số: giữ nguyên mã sản phẩm (c6n, h8c, ipc-hfw1230s1)."""
    t = unicodedata.normalize("NFC", text or "").lower().strip()
    return re.sub(r"\s+", " ", strip_accents(t))


def _is_number(token: str) -> bool:
    return token.replace(".", "").replace(",", "").isdigit()


def normalize(text: str) -> str:
    """Chữ thường, bỏ dấu, thay viết tắt, gọn khoảng trắng. Dùng cho model phân loại ý định và đọc số tiền."""
    t = basic(text)
    # Tách số dính chữ: "1tr5" -> "1 tr 5", "500k" -> "500 k", "4mp" -> "4 mp"
    t = re.sub(r"(\d)([a-z])", r"\1 \2", t)
    t = re.sub(r"([a-z])(\d)", r"\1 \2", t)
    t = re.sub(r"[^\w\s.,/%+-]", " ", t)
    out = []
    for w in t.split():
        if out and _is_number(out[-1]) and w in ("k", "tr", "m"):
            out.append(w)  # "500 k" (nghìn), "2 k" (độ phân giải 2K), "1 tr" (triệu): để entities.py đọc
        else:
            out.extend(ABBREVIATIONS.get(w, w).split())
    return " ".join(out)
