package com.secureshop.service;

import com.secureshop.dto.product.CompareResponse;
import com.secureshop.dto.product.CompareResponse.Item;
import com.secureshop.dto.product.CompareResponse.Row;
import com.secureshop.entity.Product;
import com.secureshop.entity.ProductSpec;
import com.secureshop.entity.enums.Placement;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.ProductReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.ToDoubleFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * So sánh 2 sản phẩm và đề xuất nên chọn cái nào.
 *
 * Cách chấm điểm (dễ giải thích, không phải "hộp đen"):
 *  - Mỗi tiêu chí có 1 trọng số (giá: 3, đánh giá: 2, độ phân giải: 2, ...).
 *  - Bên tốt hơn ở tiêu chí nào được trọn trọng số tiêu chí đó; bằng nhau thì mỗi bên một nửa.
 *  - Tiêu chí mà 1 trong 2 sản phẩm không có số liệu thì chỉ hiển thị, không tính điểm.
 *  - Điểm % = điểm đạt được / tổng trọng số các tiêu chí được chấm.
 *  - Chênh lệch dưới 10% tổng điểm -> coi như ngang nhau, khuyên chọn theo nhu cầu.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompareService {

    static final double TIE_MARGIN = 0.10;

    private final ProductRepository productRepository;
    private final ProductReviewRepository reviewRepository;

    /** Cách đọc & chấm 1 thông số kỹ thuật. presenceMatters: có tính năng thì hơn hẳn bên không có. */
    private record SpecRule(double weight, boolean higherBetter, boolean presenceMatters,
                            ToDoubleFunction<String> parse, String better, String unit) {
        SpecRule(double weight, boolean higherBetter, boolean presenceMatters, ToDoubleFunction<String> parse, String better) {
            this(weight, higherBetter, presenceMatters, parse, better, "");
        }
    }

    private static final Map<String, SpecRule> SPEC_RULES = Map.ofEntries(
            Map.entry("resolution_mp", new SpecRule(2, true, false, CompareService::firstNumber, "Hình ảnh nét hơn", "MP")),
            Map.entry("night_distance_m", new SpecRule(2, true, false, CompareService::firstNumber, "Nhìn đêm xa hơn", "m")),
            Map.entry("ip_rating", new SpecRule(1, true, false, CompareService::ipNumber, "Chống nước bụi tốt hơn")),
            Map.entry("pan_tilt", new SpecRule(1.5, true, true, CompareService::sumNumbers, "Xoay quét rộng hơn")),
            Map.entry("ai_detection", new SpecRule(1.5, true, true, CompareService::countItems, "Nhiều tính năng AI hơn")),
            Map.entry("unlock_methods", new SpecRule(1.5, true, false, CompareService::countItems, "Nhiều cách mở khoá hơn")),
            Map.entry("fingerprint_capacity", new SpecRule(1, true, false, CompareService::firstNumber, "Lưu được nhiều vân tay hơn")),
            Map.entry("channels", new SpecRule(1.5, true, false, CompareService::firstNumber, "Gắn được nhiều camera hơn", " kênh")),
            Map.entry("poe_ports", new SpecRule(1, true, false, CompareService::firstNumber, "Nhiều cổng PoE hơn", " cổng")),
            Map.entry("max_hdd", new SpecRule(1, true, false, CompareService::sizeInGb, "Hỗ trợ ổ cứng lớn hơn")),
            Map.entry("capacity", new SpecRule(2, true, false, CompareService::sizeInGb, "Dung lượng lớn hơn")),
            Map.entry("storage", new SpecRule(1, true, false, CompareService::sizeInGb, "Lưu trữ được nhiều hơn")),
            Map.entry("siren_db", new SpecRule(1, true, false, CompareService::firstNumber, "Còi báo động to hơn", "dB")),
            Map.entry("detection_range_m", new SpecRule(1, true, false, CompareService::firstNumber, "Phát hiện xa hơn", "m"))
    );

    public CompareResponse compare(List<String> slugs) {
        List<String> clean = slugs == null ? List.of()
                : slugs.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
        if (clean.size() != 2) throw ApiException.badRequest("Hãy chọn đúng 2 sản phẩm khác nhau để so sánh");
        Product a = load(clean.get(0));
        Product b = load(clean.get(1));
        return compare(a, b, rating(a), rating(b));
    }

    private Product load(String slug) {
        return productRepository.findBySlugAndStatus(slug, ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm " + slug));
    }

    /** [điểm trung bình, số lượt đánh giá] */
    private double[] rating(Product p) {
        long count = 0, sum = 0;
        for (Object[] row : reviewRepository.countByRating(p.getId())) {
            long n = ((Number) row[1]).longValue();
            count += n;
            sum += n * ((Number) row[0]).intValue();
        }
        return new double[]{count == 0 ? 0 : (double) sum / count, count};
    }

    /** Phần chấm điểm thuần (không đụng DB) để viết unit test. */
    CompareResponse compare(Product a, Product b, double[] ratingA, double[] ratingB) {
        List<Row> rows = new ArrayList<>();
        // Lý do kèm trọng số, cuối cùng sắp xếp: lý do quan trọng hơn đứng trước
        List<List<Reason>> why = List.of(new ArrayList<>(), new ArrayList<>());
        String nameA = a.getName(), nameB = b.getName();
        boolean sameCategory = Objects.equals(a.getCategory().getId(), b.getCategory().getId());

        // ---- Tổng quan ----
        BigDecimal pa = a.getEffectivePrice(), pb = b.getEffectivePrice();
        Integer priceWin = null;
        BigDecimal diff = pa.subtract(pb).abs();
        BigDecimal cheaper = pa.min(pb);
        // chênh dưới 3% giá -> coi như bằng nhau
        if (cheaper.signum() > 0 && diff.multiply(BigDecimal.valueOf(100)).compareTo(cheaper.multiply(BigDecimal.valueOf(3))) >= 0) {
            priceWin = pa.compareTo(pb) < 0 ? 0 : 1;
            why.get(priceWin).add(new Reason(3, "Rẻ hơn " + money(diff)));
        }
        rows.add(new Row("Tổng quan", "Giá bán", List.of(money(pa), money(pb)), priceWin, true, 3));

        boolean bothRated = ratingA[1] > 0 && ratingB[1] > 0;
        Integer rateWin = bothRated ? higher(ratingA[0], ratingB[0], 0.05) : null;
        if (rateWin != null) {
            why.get(rateWin).add(new Reason(2, String.format(Locale.ROOT, "Khách đánh giá cao hơn (%.1f★ so với %.1f★)",
                    rateWin == 0 ? ratingA[0] : ratingB[0], rateWin == 0 ? ratingB[0] : ratingA[0])));
        }
        rows.add(new Row("Tổng quan", "Đánh giá", List.of(ratingText(ratingA), ratingText(ratingB)), rateWin, bothRated, 2));

        Integer warrantyWin = higher(a.getWarrantyMonths(), b.getWarrantyMonths(), 0);
        if (warrantyWin != null) {
            why.get(warrantyWin).add(new Reason(1.5, String.format("Bảo hành dài hơn (%d so với %d tháng)",
                    warrantyWin == 0 ? a.getWarrantyMonths() : b.getWarrantyMonths(),
                    warrantyWin == 0 ? b.getWarrantyMonths() : a.getWarrantyMonths())));
        }
        rows.add(new Row("Tổng quan", "Bảo hành", List.of(a.getWarrantyMonths() + " tháng", b.getWarrantyMonths() + " tháng"),
                warrantyWin, true, 1.5));

        Integer soldWin = higher(a.getSoldCount(), b.getSoldCount(), 0.10);
        if (soldWin != null) why.get(soldWin).add(new Reason(1, "Bán chạy hơn"));
        rows.add(new Row("Tổng quan", "Đã bán", List.of(String.valueOf(a.getSoldCount()), String.valueOf(b.getSoldCount())),
                soldWin, true, 1));

        rows.add(new Row("Tổng quan", "Thương hiệu", List.of(brand(a), brand(b)), null, false, 0));
        rows.add(new Row("Tổng quan", "Loại sản phẩm", List.of(a.getCategory().getName(), b.getCategory().getName()), null, false, 0));
        rows.add(new Row("Tổng quan", "Vị trí lắp", List.of(placement(a.getPlacement()), placement(b.getPlacement())), null, false, 0));
        rows.add(new Row("Tổng quan", "Tình trạng", List.of(stock(a), stock(b)), null, false, 0));

        // ---- Thông số kỹ thuật: theo thứ tự của sản phẩm thứ nhất, rồi thêm thông số chỉ bên thứ hai có ----
        Map<String, ProductSpec> specA = specMap(a), specB = specMap(b);
        LinkedHashSet<String> keys = new LinkedHashSet<>(specA.keySet());
        keys.addAll(specB.keySet());
        for (String key : keys) {
            ProductSpec sa = specA.get(key), sb = specB.get(key);
            String label = sa != null ? sa.getSpecLabel() : sb.getSpecLabel();
            String va = sa != null ? sa.getSpecValue() : "—";
            String vb = sb != null ? sb.getSpecValue() : "—";
            SpecRule rule = SPEC_RULES.get(key);
            Integer win = null;
            boolean scored = false;
            if (rule != null && sameCategory) {
                double na = sa != null ? rule.parse().applyAsDouble(sa.getSpecValue()) : (rule.presenceMatters() ? 0 : Double.NaN);
                double nb = sb != null ? rule.parse().applyAsDouble(sb.getSpecValue()) : (rule.presenceMatters() ? 0 : Double.NaN);
                if (!Double.isNaN(na) && !Double.isNaN(nb)) {
                    scored = true;
                    win = rule.higherBetter() ? higher(na, nb, 0) : higher(nb, na, 0);
                    if (win != null) {
                        String mine = withUnit(win == 0 ? va : vb, rule.unit()), theirs = withUnit(win == 0 ? vb : va, rule.unit());
                        why.get(win).add(new Reason(rule.weight(), rule.better()
                                + ("—".equals(theirs) ? " (bên kia không có)" : " (" + mine + " so với " + theirs + ")")));
                    }
                }
            }
            rows.add(new Row("Thông số kỹ thuật", label, List.of(va, vb), win, scored, scored && rule != null ? rule.weight() : 0));
        }

        List<List<String>> reasons = why.stream()
                .map(list -> list.stream().sorted(Comparator.comparingDouble(Reason::weight).reversed()).map(Reason::text).toList())
                .toList();

        // ---- Tính điểm ----
        double total = 0, ptsA = 0, ptsB = 0;
        for (Row r : rows) {
            if (!r.scored()) continue;
            total += r.weight();
            if (r.winner() == null) { ptsA += r.weight() / 2; ptsB += r.weight() / 2; }
            else if (r.winner() == 0) ptsA += r.weight();
            else ptsB += r.weight();
        }
        int scoreA = total == 0 ? 50 : (int) Math.round(ptsA * 100 / total);
        int scoreB = total == 0 ? 50 : 100 - scoreA;
        Integer winner = total > 0 && Math.abs(ptsA - ptsB) >= total * TIE_MARGIN ? (ptsA > ptsB ? 0 : 1) : null;

        // ---- Kết luận & lời khuyên ----
        List<String> advice = new ArrayList<>();
        String verdict;
        if (winner == null) {
            verdict = "Hai sản phẩm khá ngang nhau, hãy chọn theo nhu cầu của bạn";
        } else {
            Product w = winner == 0 ? a : b;
            verdict = "Nên chọn " + w.getName();
        }
        if (!sameCategory) {
            advice.add("Hai sản phẩm thuộc 2 loại khác nhau (" + a.getCategory().getName() + " và " + b.getCategory().getName()
                    + ") nên chỉ so sánh được giá, đánh giá, bảo hành. Kết quả chỉ mang tính tham khảo.");
        }
        if (a.getPlacement() != null && b.getPlacement() != null && a.getPlacement() != b.getPlacement()
                && a.getPlacement() != Placement.BOTH && b.getPlacement() != Placement.BOTH) {
            advice.add(nameA + " lắp " + placement(a.getPlacement()).toLowerCase() + ", còn " + nameB + " lắp "
                    + placement(b.getPlacement()).toLowerCase() + ". Hãy ưu tiên đúng vị trí bạn định lắp.");
        }
        // Chi phí ẩn: thiết bị cần mua thêm đầu ghi / gateway mới dùng được
        for (Product p : List.of(a, b)) {
            ProductSpec conn = specMap(p).get("connectivity");
            if (conn != null && conn.getSpecValue().toLowerCase().contains("cần")) {
                Matcher m = Pattern.compile("\\(([^)]*cần[^)]*)\\)", Pattern.CASE_INSENSITIVE).matcher(conn.getSpecValue());
                String need = m.find() ? m.group(1) : conn.getSpecValue();
                advice.add("Lưu ý: " + p.getName() + " " + Character.toLowerCase(need.charAt(0)) + need.substring(1)
                        + " mới sử dụng được, nên tính thêm chi phí thiết bị này.");
            }
        }
        if (!reasons.get(0).isEmpty()) advice.add("Chọn " + nameA + " nếu bạn ưu tiên: " + shortList(reasons.get(0)) + ".");
        if (!reasons.get(1).isEmpty()) advice.add("Chọn " + nameB + " nếu bạn ưu tiên: " + shortList(reasons.get(1)) + ".");
        if (winner != null) {
            Product w = winner == 0 ? a : b, other = winner == 0 ? b : a;
            if (w.getStock() <= 0 && other.getStock() > 0) {
                advice.add(w.getName() + " đang hết hàng. Nếu cần lắp ngay, " + other.getName() + " là lựa chọn thay thế.");
            }
            if (priceWin != null && !priceWin.equals(winner)) {
                advice.add(w.getName() + " đắt hơn " + money(diff) + " nhưng tốt hơn ở nhiều tiêu chí quan trọng; nếu ngân sách hạn chế, "
                        + other.getName() + " vẫn là lựa chọn tiết kiệm.");
            }
        }

        return new CompareResponse(List.of(item(a, ratingA), item(b, ratingB)), sameCategory, rows,
                List.of(scoreA, scoreB), winner, verdict, reasons, advice);
    }

    // ---------------------------------------------------------------- tiện ích

    private record Reason(double weight, String text) {
    }

    /** Bên nào lớn hơn (0/1); chênh lệch tương đối nhỏ hơn margin thì null (ngang nhau). */
    static Integer higher(double x, double y, double margin) {
        if (x == y) return null;
        double base = Math.max(Math.abs(x), Math.abs(y));
        if (base > 0 && Math.abs(x - y) / base < margin) return null;
        return x > y ? 0 : 1;
    }

    private static final Pattern NUM = Pattern.compile("(\\d+(?:[.,]\\d+)?)");

    static double firstNumber(String s) {
        Matcher m = NUM.matcher(s == null ? "" : s);
        return m.find() ? Double.parseDouble(m.group(1).replace(',', '.')) : Double.NaN;
    }

    static double sumNumbers(String s) {
        Matcher m = NUM.matcher(s == null ? "" : s);
        double sum = 0; boolean any = false;
        while (m.find()) { sum += Double.parseDouble(m.group(1).replace(',', '.')); any = true; }
        return any ? sum : Double.NaN;
    }

    /** "IP66" -> 66 */
    static double ipNumber(String s) {
        Matcher m = Pattern.compile("IP\\s*(\\d{2})", Pattern.CASE_INSENSITIVE).matcher(s == null ? "" : s);
        return m.find() ? Double.parseDouble(m.group(1)) : Double.NaN;
    }

    /** Số mục liệt kê, vd "Vân tay, mã số, thẻ" -> 3 */
    static double countItems(String s) {
        if (s == null || s.isBlank()) return Double.NaN;
        return Arrays.stream(s.split("[,;]")).filter(x -> !x.isBlank()).count();
    }

    /** "2TB" -> 2000, "128GB" -> 128, "tối đa 10TB" -> 10000 (lấy số lớn nhất) */
    static double sizeInGb(String s) {
        Matcher m = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(TB|GB)", Pattern.CASE_INSENSITIVE).matcher(s == null ? "" : s);
        double max = Double.NaN;
        while (m.find()) {
            double v = Double.parseDouble(m.group(1).replace(',', '.')) * (m.group(2).equalsIgnoreCase("TB") ? 1000 : 1);
            max = Double.isNaN(max) ? v : Math.max(max, v);
        }
        return max;
    }

    static String money(BigDecimal v) {
        return String.format("%,d", v.setScale(0, java.math.RoundingMode.HALF_UP).longValue()).replace(',', '.') + " ₫";
    }

    /** "30" + "m" -> "30m"; giá trị có chữ (vd "IP66") giữ nguyên. */
    private static String withUnit(String value, String unit) {
        return unit.isEmpty() || !value.matches("\\d+(?:[.,]\\d+)?") ? value : value + unit;
    }

    private static String shortList(List<String> reasons) {
        // "Rẻ hơn 300.000 ₫" -> "rẻ hơn 300.000 ₫"; bỏ phần (… so với …) cho gọn
        return reasons.stream().limit(3)
                .map(r -> r.replaceAll("\\s*\\(.*\\)$", ""))
                .map(r -> Character.toLowerCase(r.charAt(0)) + r.substring(1))
                .reduce((x, y) -> x + ", " + y).orElse("");
    }

    private static Map<String, ProductSpec> specMap(Product p) {
        Map<String, ProductSpec> map = new LinkedHashMap<>();
        for (ProductSpec s : p.getSpecs()) map.putIfAbsent(s.getSpecKey(), s);
        return map;
    }

    private static String ratingText(double[] r) {
        return r[1] == 0 ? "Chưa có đánh giá" : String.format(Locale.ROOT, "%.1f★ (%d lượt)", r[0], (long) r[1]);
    }

    private static String brand(Product p) {
        return p.getBrand() != null ? p.getBrand().getName() : "—";
    }

    private static String placement(Placement p) {
        if (p == null) return "—";
        return switch (p) {
            case INDOOR -> "Trong nhà";
            case OUTDOOR -> "Ngoài trời";
            case BOTH -> "Trong nhà & ngoài trời";
        };
    }

    private static String stock(Product p) {
        return p.getStock() > 0 ? "Còn hàng (" + p.getStock() + ")" : "Hết hàng";
    }

    private static Item item(Product p, double[] r) {
        return new Item(p.getId(), p.getName(), p.getSlug(), p.getThumbnailUrl(), p.getPrice(), p.getSalePrice(),
                p.getEffectivePrice(), p.getStock(), p.getWarrantyMonths(), brand(p), p.getCategory().getName(),
                r[1] == 0 ? null : Math.round(r[0] * 10) / 10.0, (long) r[1], p.getSoldCount());
    }
}
