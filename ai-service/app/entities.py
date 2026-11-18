"""Trích xuất thông tin (entity) từ câu của khách bằng luật + từ điển.

Ví dụ: "camera ngoài trời quay đêm có màu tầm 1tr5, nhà 2 tầng cần 3 mắt"
 -> {device: camera, placement: OUTDOOR, features: [night_color], budget_min: 750000, budget_max: 1725000,
     quantity: 3, floors: 2}

Vì sao dùng luật thay vì model? Số tiền, thương hiệu, mã sản phẩm có dạng cố định, luật cho kết quả chính xác
và giải thích được. Khi có đủ dữ liệu gán nhãn, có thể thay bằng model NER (PhoBERT) mà vẫn giữ nguyên
định dạng kết quả trả về (xem README.md).
"""
import re

from .text import basic, normalize

# ----------------------------------------------------------------------------- từ điển
DEVICES = [  # (mã, các cụm từ) - xếp theo ưu tiên: cụ thể trước, chung chung sau
    ("smart_lock", [r"khoa (cua|van tay|thong minh|mat ma|the tu|dien tu|khuon mat)", r"\bkhoa van tay\b", r"\bsmart ?lock\b", r"\bkhoa\b.*\b(van tay|mat ma)\b"]),
    ("doorbell", [r"chuong cua", r"chuong (co )?hinh", r"\bdoorbell\b", r"chuong bao khach"]),
    ("recorder", [r"dau ghi", r"\bnvr\b", r"\bdvr\b", r"\bxvr\b"]),
    ("sensor", [r"cam bien", r"bao dong", r"bao trom", r"coi hu", r"\bsensor\b", r"bao chay"]),
    ("accessory", [r"the nho", r"o cung", r"\bhdd\b", r"\bsd\b", r"phu kien", r"\bmicro ?sd\b"]),
    ("camera", [r"\bcamera\b", r"quan sat", r"giam sat", r"\bcctv\b", r"\bip camera\b", r"\bmat camera\b"]),
]

OUTDOOR = [r"ngoai troi", r"ngoai san", r"san vuon", r"\bvuon\b", r"\bcong\b", r"truoc nha", r"mat tien", r"hien nha",
           r"ban cong", r"san thuong", r"nha xuong", r"bai (giu )?xe", r"ngoai duong", r"hang rao", r"chong nuoc",
           r"mua nang", r"ngoai cua", r"\bsan\b", r"trang trai", r"\bao ca\b", r"cong trinh", r"\bnha kho\b"]
INDOOR = [r"trong nha", r"phong khach", r"phong ngu", r"em be", r"tre (em|nho)", r"con nho", r"nguoi gia",
          r"trong phong", r"cua hang", r"van phong", r"thu ngan", r"\bbep\b", r"can ho", r"chung cu",
          # "cho" (giới từ) trùng "chó" khi bỏ dấu -> chỉ nhận "nuôi chó", "con chó", "chó mèo"
          r"thu cung", r"nuoi (cho|meo)", r"con (cho|meo)", r"\bcho meo\b", r"ong ba", r"giup viec", r"quay hang", r"phong tro"]

BRANDS = [  # (slug trong DB, cụm từ)
    ("ezviz", [r"\bezviz\b", r"\bez viz\b"]),
    ("imou", [r"\bimou\b"]),
    ("hikvision", [r"\bhikvision\b", r"\bhik\b", r"\bhik vision\b"]),
    ("dahua", [r"\bdahua\b"]),
    ("tp-link-tapo", [r"\btapo\b", r"\btp ?-?link\b"]),
    ("kbvision", [r"\bkb ?vision\b", r"\bkbvision\b"]),
    ("philips", [r"\bphilips?\b"]),
    ("kaadas", [r"\bkaadas\b"]),
    ("xiaomi", [r"\bxiaomi\b", r"\bmi home\b", r"\bmijia\b"]),
    ("kingston", [r"\bkingston\b"]),
    ("western-digital", [r"\bwestern( digital)?\b", r"\bwd\b"]),
]

FEATURES = [
    ("night_color", [r"(ban )?dem (co )?mau", r"quay dem (co )?mau", r"full ?color", r"color ?vu", r"mau ban dem", r"night ?color"]),
    # không dùng "toi": bỏ dấu thì "tối" trùng "tôi", "tới"
    ("night_vision", [r"ban dem", r"quay dem", r"hong ngoai", r"nhin dem", r"\btoi om\b", r"thieu sang", r"buoi dem", r"\bca dem\b"]),
    ("two_way_audio", [r"dam thoai", r"noi chuyen", r"(hai|2) chieu", r"nghe (duoc )?tieng", r"giao tiep", r"\bmic\b", r"\bloa\b"]),  # "\bloa\b": tránh khớp "loai"
    ("pan_tilt", [r"\bxoay\b", r"\b360\b", r"quay quet", r"\bptz\b", r"xoay quet"]),
    ("waterproof", [r"chong nuoc", r"\bip ?6[5-8]\b", r"\bmua\b", r"chiu nuoc"]),
    # không dùng "ai" một mình: trùng "ai" (người nào) -> chỉ nhận "camera ai", "tính năng ai"...
    ("ai_detection", [r"phat hien nguoi", r"nhan dien", r"(camera|tinh nang|cong nghe) ai\b", r"\bai (phat hien|thong minh)",
                      r"canh bao chuyen dong", r"phat hien chuyen dong",
                      r"bao (dong )?khi co nguoi", r"theo doi chuyen dong"]),
    ("wireless", [r"khong day", r"\bwifi\b", r"khong can (keo )?day", r"it day", r"k day", r"khong phai di day"]),
    ("battery", [r"\bpin\b", r"khong can dien", r"nang luong mat troi", r"\bsolar\b", r"sac (pin|lai)"]),
    ("sim_4g", [r"\b4 ?g\b", r"\bsim\b", r"khong co wifi", r"khong wifi", r"vung xa", r"khong co mang"]),
    ("fingerprint", [r"van tay"]),
    ("face_id", [r"khuon mat", r"\bface\b"]),
    ("cloud", [r"\bcloud\b", r"dam may"]),
]

LOCATIONS = [
    ("baby_room", [r"em be", r"tre (em|nho|so sinh)", r"con nho", r"\bbe\b", r"bao mau"]),
    ("elderly", [r"nguoi gia", r"ong ba", r"bo me gia", r"nguoi benh"]),
    ("pet", [r"thu cung", r"nuoi (cho|meo)", r"con (cho|meo)", r"\bcho meo\b"]),
    # không dùng "shop": khách hay gọi "shop ơi", "vậy shop" (gọi cửa hàng mình), không phải nói về cửa hàng của họ
    ("shop", [r"cua hang", r"\btiem\b", r"\bquan (an|cafe|ca phe|tap hoa)\b", r"tap hoa", r"sieu thi"]),
    ("office", [r"van phong", r"cong ty", r"phong lam viec"]),
    ("warehouse", [r"\bkho\b", r"nha xuong", r"\bxuong\b", r"cong trinh", r"trang trai"]),
    ("apartment", [r"chung cu", r"can ho", r"phong tro"]),
    ("villa", [r"biet thu"]),
    ("home", [r"\bnha\b", r"gia dinh", r"nha o", r"nha pho"]),
]

CHEAP = [r"\bre\b", r"gia re", r"binh dan", r"sinh vien", r"tiet kiem", r"hop ly", r"vua tui tien", r"kinh te"]
PREMIUM = [r"cao cap", r"xin\b", r"tot nhat", r"loai tot", r"chat luong cao", r"xin nhat", r"dat cung duoc"]

UNIT_MILLION = r"(?:trieu|tr|cu|m)"
UNIT_THOUSAND = r"(?:nghin|ngan|k|ka)"
WORD_MAX = r"(?:duoi|toi da|khong qua|it hon|re hon|<=|<|max|do lai|thap hon|chua toi|khong vuot)"
WORD_MIN = r"(?:tren|hon|it nhat|>=|>|toi thieu|tro len|cao hon)"
WORD_AROUND = r"(?:tam|khoang|co|gan|xap xi|quanh|chung|co tam)"  # "ngân sách X" = tối đa X (mặc định)


def _any(patterns, text):
    return any(re.search(p, text) for p in patterns)


def _first(groups, text):
    for key, patterns in groups:
        if _any(patterns, text):
            return key
    return None


def _all(groups, text):
    return [key for key, patterns in groups if _any(patterns, text)]


# ----------------------------------------------------------------------------- số tiền
def _to_float(s):
    return float(s.replace(",", "."))


def find_amounts(t):
    """Tìm các số tiền trong câu đã chuẩn hoá. Trả về [(giá_trị_VNĐ, vị_trí_bắt_đầu, vị_trí_kết_thúc)]."""
    found = []
    taken = []

    def free(a, b):
        return all(b <= x or a >= y for x, y in taken)

    # "1 tr 5", "1,5 trieu", "2 tr 500", "3 cu"
    for m in re.finditer(rf"(\d+(?:[.,]\d+)?)\s*{UNIT_MILLION}\b(?:\s*(\d{{1,3}})\b(?!\s*{UNIT_THOUSAND}\b(?!\s*day)))?", t):
        base = _to_float(m.group(1)) * 1_000_000
        tail = m.group(2)
        if tail:
            base += int(tail) * (10 ** (6 - len(tail)))  # "1 tr 5" -> +500.000 ; "2 tr 500" -> +500.000
        found.append((int(base), m.start(), m.end()))
        taken.append((m.start(), m.end()))
    # "500 k", "800 nghin" (bỏ "2 k"/"4 k" = độ phân giải; bỏ "k day" = không dây)
    for m in re.finditer(rf"(\d+(?:[.,]\d+)?)\s*{UNIT_THOUSAND}\b(?!\s*day)", t):
        value = _to_float(m.group(1))
        if value < 50 or not free(m.start(), m.end()):
            continue
        found.append((int(value * 1000), m.start(), m.end()))
        taken.append((m.start(), m.end()))
    # "1.500.000", "1500000 d"
    for m in re.finditer(r"\b(\d{1,3}(?:[.,]\d{3})+|\d{6,9})\b\s*(?:d|dong|vnd)?", t):
        if not free(m.start(), m.end()):
            continue
        value = int(re.sub(r"[.,]", "", m.group(1)))
        if value >= 100_000:
            found.append((value, m.start(), m.end()))
            taken.append((m.start(), m.end()))
    return sorted(found, key=lambda x: x[1])


def extract_budget(t):
    amounts = find_amounts(t)
    if not amounts:
        return {}
    # Khoảng: "tu 1 trieu den 2 trieu", "1-2 trieu", "1 den 2 tr"
    rng = re.search(rf"(\d+(?:[.,]\d+)?)\s*(?:-|den|toi)\s*(\d+(?:[.,]\d+)?)\s*{UNIT_MILLION}\b", t)
    if rng:
        lo, hi = sorted([_to_float(rng.group(1)), _to_float(rng.group(2))])
        return {"budget_min": int(lo * 1_000_000), "budget_max": int(hi * 1_000_000)}
    if len(amounts) >= 2 and re.search(r"\b(tu|trong khoang)\b", t):
        lo, hi = sorted([amounts[0][0], amounts[1][0]])
        return {"budget_min": lo, "budget_max": hi}

    value, start, end = amounts[0]
    before = t[max(0, start - 25):start]
    after = t[end:end + 15]
    if re.search(rf"{WORD_MAX}\s*$", before) or re.search(r"^\s*(tro xuong|do lai|thoi)\b", after):
        return {"budget_max": value}
    if re.search(rf"{WORD_MIN}\s*$", before) or re.search(r"^\s*tro len\b", after):
        return {"budget_min": value}
    if re.search(rf"{WORD_AROUND}\s*$", before):
        return {"budget_min": round(value * 0.5), "budget_max": round(value * 1.15)}
    return {"budget_max": value}  # "ngân sách 2 triệu" -> không vượt 2 triệu


# ----------------------------------------------------------------------------- các thông tin khác
def extract_resolution(t):
    m = re.search(r"(\d{1,2})\s*(?:mp|megapixel|cham)\b", t)
    if m:
        return int(m.group(1))
    m = re.search(r"\b([2-8])\s*k\b(?!\s*day)", t)
    if m and not re.search(rf"\b{m.group(1)}\s*k\s*\d", t):
        return {2: 3, 3: 5, 4: 8, 5: 8, 8: 8}.get(int(m.group(1)), 3)
    if re.search(r"full ?hd|1080", t):
        return 2
    if re.search(r"\b(net|ro net|sac net|ro rang|chat luong cao)\b", t):
        return 3
    return None


def extract_quantity(t):
    out = {}
    m = re.search(r"\b(\d{1,2})\s*(?:cai|chiec|mat|con|bo|camera|cam|thiet bi|diem)\b", t)
    if m:
        out["quantity"] = int(m.group(1))
    m = re.search(r"\b(\d)\s*(?:tang|lau)\b", t)
    if m:
        out["floors"] = int(m.group(1))
    m = re.search(r"\b(\d{2,4})\s*(?:m2|met vuong|m vuong)\b", t)
    if m:
        out["area_m2"] = int(m.group(1))
    return out


def extract_product_codes(raw_basic):
    """Mã sản phẩm: c6n, h8c, c200, ipc-hfw1230s1, dw-1000... (lấy từ câu CHƯA tách chữ/số)."""
    codes = []
    for token in re.findall(r"\b[a-z]{1,6}-?\d+[a-z0-9-]*\b", raw_basic):
        if re.fullmatch(r"\d+(tr|k|m|mp|gb|tb|g|d|m2|h|p)?\d*", token):
            continue
        if re.fullmatch(r"(ip6\d|wifi\d*|4g|5g|2k|4k|3k|ip)", token):
            continue
        if len(token) >= 3:
            codes.append(token)
    return codes[:3]


def extract(text: str) -> dict:
    """Trả về dict entity (chỉ có khoá nào tìm thấy)."""
    raw = basic(text)
    t = normalize(text)
    ent = {}

    device = _first(DEVICES, t)
    if device:
        ent["device"] = device
        ent["devices"] = _all(DEVICES, t)
    out_hit, in_hit = _any(OUTDOOR, t), _any(INDOOR, t)
    if out_hit and in_hit:
        ent["placement"] = "BOTH"
    elif out_hit:
        ent["placement"] = "OUTDOOR"
    elif in_hit:
        ent["placement"] = "INDOOR"

    brands = _all(BRANDS, t)
    if brands:
        ent["brand"] = brands[0]
        if len(brands) > 1:
            ent["brands"] = brands  # vd. "so sánh Tapo với Imou"
    ent.update(extract_budget(t))

    res = extract_resolution(t)
    if res:
        ent["min_resolution_mp"] = res

    features = _all(FEATURES, t)
    if "night_color" in features and "night_vision" in features:
        features.remove("night_vision")
    if "wireless" in features and re.search(r"khong (co )?wifi", t):
        features.remove("wireless")  # "không có wifi" là nói về chỗ lắp, không phải muốn camera wifi
    if features:
        ent["features"] = features

    location = _first(LOCATIONS, t)
    if location:
        ent["location"] = location
    ent.update(extract_quantity(t))

    if _any(CHEAP, t):
        ent["price_pref"] = "cheap"
    elif _any(PREMIUM, t):
        ent["price_pref"] = "premium"

    codes = extract_product_codes(raw)
    if codes:
        ent["product_codes"] = codes

    # Suy luận thêm: phòng em bé / người già -> trong nhà + đàm thoại
    if location in ("baby_room", "elderly", "pet") and "placement" not in ent:
        ent["placement"] = "INDOOR"
    if location == "warehouse" and "placement" not in ent:
        ent["placement"] = "OUTDOOR"
    return ent
