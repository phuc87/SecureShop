package com.secureshop.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.secureshop.dto.ai.AiReply;
import com.secureshop.dto.ai.AiReply.Link;
import com.secureshop.dto.product.ProductSummaryResponse;
import com.secureshop.entity.AiChatLog;
import com.secureshop.entity.Order;
import com.secureshop.entity.Product;
import com.secureshop.entity.enums.Role;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.AiChatLogRepository;
import com.secureshop.repository.OrderRepository;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.ProductSpecifications;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * BỘ ĐIỀU PHỐI HỘI THOẠI của trợ lý AI.
 *
 *   Khách gõ câu -> ai-service (Python) trả intent + entities
 *                -> ở đây: ghép ngữ cảnh các câu trước, sửa intent khi model không chắc,
 *                   tìm sản phẩm THẬT trong DB và chấm điểm theo tính năng khách cần,
 *                   soạn câu trả lời + nút gợi ý, lưu ai_chat_logs.
 *
 * Model chỉ cần "hiểu"; mọi dữ liệu (giá, tồn kho, phí ship...) lấy từ DB/cấu hình nên luôn đúng và mới nhất.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private static final Locale VI = Locale.forLanguageTag("vi-VN");
    private static final Set<String> SHOPPING = Set.of("product_advice", "price_query", "compare");
    private static final int MAX_PER_MINUTE = 20;

    private final AiClient aiClient;
    private final AiChatLogRepository logRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ChatService chatService;
    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> rate = new ConcurrentHashMap<>();

    @Value("${app.ai.min-confidence}")
    private double minConfidence;
    @Value("${app.shop.name}")
    private String shopName;
    @Value("${app.shop.hotline}")
    private String hotline;
    @Value("${app.shop.address}")
    private String address;
    @Value("${app.shop.hours}")
    private String hours;
    @Value("${app.shop.email}")
    private String email;
    @Value("${app.shop.bank-name}")
    private String bankName;
    @Value("${app.shop.bank-account}")
    private String bankAccount;
    @Value("${app.shop.bank-holder}")
    private String bankHolder;
    @Value("${app.order.free-shipping-from}")
    private long freeShippingFrom;
    @Value("${app.order.shipping-fee}")
    private long shippingFee;

    // ================================================================ TỪ ĐIỂN HIỂN THỊ
    private static final Map<String, String> DEVICE_LABEL = Map.of(
            "camera", "camera", "smart_lock", "khóa cửa thông minh", "doorbell", "chuông cửa có hình",
            "recorder", "đầu ghi hình", "sensor", "cảm biến / báo động", "accessory", "phụ kiện (thẻ nhớ, ổ cứng)");
    private static final Map<String, List<String>> DEVICE_CATEGORIES = Map.of(
            "smart_lock", List.of("khoa-cua-thong-minh"), "doorbell", List.of("chuong-cua-co-hinh"),
            "recorder", List.of("dau-ghi-hinh"), "sensor", List.of("cam-bien-bao-dong"), "accessory", List.of("phu-kien"));
    private static final Map<String, String> FEATURE_LABEL = Map.ofEntries(
            Map.entry("night_color", "ban đêm có màu"), Map.entry("night_vision", "quay ban đêm"),
            Map.entry("two_way_audio", "đàm thoại 2 chiều"), Map.entry("pan_tilt", "xoay 360°"),
            Map.entry("waterproof", "chống nước"), Map.entry("ai_detection", "AI phát hiện người"),
            Map.entry("wireless", "WiFi không dây"), Map.entry("battery", "dùng pin"), Map.entry("sim_4g", "dùng SIM 4G"),
            Map.entry("fingerprint", "mở bằng vân tay"), Map.entry("face_id", "nhận diện khuôn mặt"), Map.entry("cloud", "lưu Cloud"));
    private static final Map<String, String> LOCATION_LABEL = Map.of(
            "baby_room", "phòng em bé", "elderly", "trông người già", "pet", "trông thú cưng", "shop", "cửa hàng",
            "office", "văn phòng", "warehouse", "kho / xưởng", "apartment", "chung cư", "villa", "biệt thự", "home", "nhà ở");
    private static final List<String> STARTERS = List.of("Tư vấn camera trong nhà", "Camera ngoài trời dưới 2 triệu",
            "Khóa vân tay cho chung cư", "Phí giao hàng thế nào?");

    // ================================================================ API CHÍNH

    /** Xử lý 1 tin nhắn của khách. me = null với khách vãng lai. */
    @Transactional
    public AiReply ask(UserPrincipal me, String sessionId, String text) {
        checkSession(sessionId);
        String message = text == null ? "" : text.trim();
        if (message.isEmpty()) throw ApiException.badRequest("Bạn chưa nhập câu hỏi");
        if (message.length() > 500) throw ApiException.badRequest("Câu hỏi tối đa 500 ký tự");
        checkRate(sessionId);
        long started = System.currentTimeMillis();

        AiChatLog entry = new AiChatLog();
        entry.setSessionId(sessionId);
        entry.setUserId(me != null ? me.id() : null);
        entry.setUserMessage(message);

        Optional<AiClient.Prediction> prediction = aiClient.predict(message);
        if (prediction.isEmpty()) {
            Reply r = new Reply("Trợ lý AI đang tạm nghỉ để bảo trì 🛠️. Bạn vẫn có thể chat với tư vấn viên "
                    + "hoặc gọi hotline " + hotline + " nhé.");
            r.quick.add("Gặp tư vấn viên");
            r.action = "OFFLINE";
            return finish(entry, r, null, started);
        }
        AiClient.Prediction p = prediction.get();
        entry.setPredictedIntent(p.intent());
        entry.setConfidence(BigDecimal.valueOf(p.confidence()).setScale(4, java.math.RoundingMode.HALF_UP));
        entry.setModelVersion(p.modelVersion() == null ? null : p.modelVersion().substring(0, Math.min(30, p.modelVersion().length())));

        AiContext current = AiContext.from(p.entities());
        List<AiChatLog> history = logRepository.findTop6BySessionIdAndCreatedAtAfterOrderByIdDesc(
                sessionId, LocalDateTime.now().minusMinutes(30));
        String intent = resolveIntent(p, current, history);
        // Đang mua hàng hoặc xin gặp nhân viên: ghép nhu cầu từ các câu trước (để tóm tắt cho tư vấn viên đủ ý)
        AiContext ctx = SHOPPING.contains(intent) || "human_handoff".equals(intent)
                ? AiContext.merge(previousContext(history), current) : current;

        Reply reply = switch (intent) {
            case "greeting" -> greeting(me);
            case "thanks_bye" -> new Reply("Cảm ơn bạn đã ghé " + shopName + "! 😊 Cần gì cứ nhắn mình bất cứ lúc nào nhé.");
            case "product_advice" -> advise(ctx);
            case "price_query" -> priceQuery(ctx);
            case "compare" -> compare(ctx);
            case "shipping" -> shipping();
            case "warranty_return" -> warranty();
            case "installation" -> installation();
            case "payment" -> payment();
            case "order_status" -> orderStatus(me);
            case "store_info" -> storeInfo();
            case "promotion" -> promotion();
            case "tech_support" -> techSupport(current);
            case "human_handoff" -> handoff(me, sessionId, ctx, history);
            case "about_bot" -> aboutBot();
            case "out_of_scope" -> outOfScope();
            default -> fallback(history);
        };
        ObjectNode ent = ctx.toJson(objectMapper);
        ent.put("_intent", intent);
        return finish(entry, reply, ent, started);
    }

    /** Nút "Gặp tư vấn viên" (không cần qua model). */
    @Transactional
    public AiReply handoffButton(UserPrincipal me, String sessionId) {
        checkSession(sessionId);
        List<AiChatLog> history = logRepository.findTop6BySessionIdAndCreatedAtAfterOrderByIdDesc(
                sessionId, LocalDateTime.now().minusMinutes(30));
        AiChatLog entry = new AiChatLog();
        entry.setSessionId(sessionId);
        entry.setUserId(me != null ? me.id() : null);
        entry.setUserMessage("[Bấm nút] Gặp tư vấn viên");
        AiContext ctx = previousContext(history);
        ObjectNode ent = ctx.toJson(objectMapper);
        ent.put("_intent", "human_handoff");
        return finish(entry, handoff(me, sessionId, ctx, history), ent, System.currentTimeMillis());
    }

    /** Khách bấm 👍 / 👎 cho 1 câu trả lời. */
    @Transactional
    public void feedback(UserPrincipal me, String sessionId, Long logId, String value) {
        checkSession(sessionId);
        if (!"GOOD".equals(value) && !"BAD".equals(value)) throw ApiException.badRequest("Đánh giá không hợp lệ");
        AiChatLog l = logRepository.findOwned(logId, sessionId, me != null ? me.id() : null)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu trả lời"));
        l.setFeedback(value);
    }

    // ================================================================ HIỂU Ý KHÁCH

    /**
     * Model thống kê đôi khi không chắc (câu ngắn, câu lạ). Ta kết hợp thêm thông tin trích xuất được:
     *  - Có tên/mã sản phẩm + từ "giá" -> hỏi giá.
     *  - Model phân vân nhưng câu có loại thiết bị/ngân sách/tính năng -> đang muốn được tư vấn mua.
     *  - Câu cụt ("ngoài trời", "dưới 2 triệu") ngay sau khi đang tư vấn -> vẫn là tư vấn.
     */
    private String resolveIntent(AiClient.Prediction p, AiContext current, List<AiChatLog> history) {
        String intent = p.intent();
        double conf = p.confidence();
        boolean previousShopping = !history.isEmpty() && SHOPPING.contains(storedIntent(history.get(0)));
        if (conf < 0.6 && current.hasShoppingSignal() && !SHOPPING.contains(intent)
                && !Set.of("tech_support", "warranty_return", "installation").contains(intent)) {
            return !current.productCodes.isEmpty() ? "price_query" : "product_advice";
        }
        if ("out_of_scope".equals(intent) && (current.hasShoppingSignal() || previousShopping && conf < 0.8)) {
            return "product_advice";
        }
        if (conf < minConfidence) {
            return previousShopping || current.hasShoppingSignal() ? "product_advice" : "fallback";
        }
        return intent;
    }

    private AiContext previousContext(List<AiChatLog> history) {
        AiContext ctx = null;
        List<AiChatLog> oldestFirst = new ArrayList<>(history);
        Collections.reverse(oldestFirst);
        for (AiChatLog l : oldestFirst) {
            JsonNode n = l.getEntities();
            if (n == null || !SHOPPING.contains(n.path("_intent").asText())) continue;
            ctx = AiContext.merge(ctx, AiContext.from(n));
        }
        return ctx == null ? new AiContext() : ctx;
    }

    private String storedIntent(AiChatLog l) {
        JsonNode n = l.getEntities();
        return n == null ? "" : n.path("_intent").asText();
    }

    // ================================================================ TƯ VẤN SẢN PHẨM

    private Reply advise(AiContext ctx) {
        if (ctx.device == null && (ctx.placement != null || ctx.minMp != null || ctx.features.stream()
                .anyMatch(f -> Set.of("night_color", "night_vision", "pan_tilt", "waterproof", "two_way_audio", "ai_detection").contains(f)))) {
            ctx.device = "camera"; // nói "ngoài trời", "quay đêm"... mà chưa nói thiết bị: hiểu là camera
        }
        if (ctx.device == null && ctx.location != null) ctx.device = "camera";
        if (ctx.device == null) {
            Reply r = new Reply("Bạn đang cần thiết bị nào ạ? Mình có thể gợi ý theo nơi lắp đặt, tính năng và ngân sách của bạn.");
            r.quick.addAll(List.of("Camera trong nhà", "Camera ngoài trời", "Khóa cửa thông minh", "Chuông cửa có hình", "Cảm biến báo động"));
            return r;
        }

        Search s = search(ctx);
        Reply r = new Reply();
        StringBuilder sb = new StringBuilder();
        sb.append("Mình hiểu bạn cần: ").append(describe(ctx)).append(".");
        if (s.note != null) sb.append("\n").append(s.note);
        if (s.products.isEmpty()) {
            sb.append("\nHiện shop chưa có mẫu phù hợp. Bạn để lại nhu cầu, tư vấn viên sẽ tìm giúp bạn nhé.");
            r.quick.add("Gặp tư vấn viên");
        } else {
            sb.append("\nGợi ý ").append(s.products.size()).append(" mẫu phù hợp nhất:");
            for (Scored sp : s.products) {
                sb.append("\n• ").append(sp.p.getName()).append(" – ").append(vnd(sp.p.getEffectivePrice()));
                if (!sp.matched.isEmpty()) {
                    sb.append(" (").append(sp.matched.stream().map(FEATURE_LABEL::get).collect(Collectors.joining(", "))).append(")");
                }
            }
            s.products.forEach(sp -> r.products.add(ProductSummaryResponse.from(sp.p)));
        }
        // Mẹo theo nhu cầu
        if ("camera".equals(ctx.device) && ctx.floors != null && ctx.quantity == null) {
            sb.append("\n💡 Nhà ").append(ctx.floors).append(" tầng thường cần khoảng ").append(ctx.floors + 1).append("–").append(ctx.floors * 2)
                    .append(" camera: cổng/mặt tiền, phòng khách, cầu thang mỗi tầng.");
        }
        if ("camera".equals(ctx.device) && ctx.quantity != null && ctx.quantity >= 4) {
            sb.append("\n💡 Từ 4 camera trở lên nên dùng thêm đầu ghi hình để lưu trữ tập trung và xem lại dễ hơn.");
            r.quick.add("Tư vấn đầu ghi hình");
        }
        if ("baby_room".equals(ctx.location) && !ctx.features.contains("two_way_audio")) {
            sb.append("\n💡 Phòng em bé nên chọn mẫu có đàm thoại 2 chiều để dỗ bé từ xa.");
        }
        // Hỏi thêm thông tin còn thiếu
        if ("camera".equals(ctx.device) && ctx.placement == null) {
            sb.append("\nBạn định lắp trong nhà hay ngoài trời để mình lọc chính xác hơn?");
            r.quick.addAll(List.of("Trong nhà", "Ngoài trời"));
        } else if (ctx.budgetMax == null && ctx.budgetMin == null) {
            sb.append("\nNgân sách của bạn khoảng bao nhiêu?");
            r.quick.addAll(List.of("Dưới 1 triệu", "Từ 1 đến 2 triệu", "Trên 2 triệu"));
        } else if (ctx.features.isEmpty() && "camera".equals(ctx.device)) {
            r.quick.addAll(List.of("Quay đêm có màu", "Có đàm thoại", "Xoay 360 độ"));
        }
        if (!r.quick.contains("Gặp tư vấn viên")) r.quick.add("Gặp tư vấn viên");
        r.text = sb.toString();
        r.links.add(new Link("Xem tất cả " + DEVICE_LABEL.getOrDefault(ctx.device, "sản phẩm"), listUrl(ctx)));
        return r;
    }

    private record Scored(Product p, double score, List<String> matched) {
    }

    private static final class Search {
        List<Scored> products = new ArrayList<>();
        String note;
    }

    /** Lọc cứng (loại, vị trí, ngân sách, hãng) rồi chấm điểm theo tính năng. Không có kết quả thì nới dần điều kiện. */
    private Search search(AiContext ctx) {
        Search s = new Search();
        List<String> categories = categoriesOf(ctx);
        Long min = ctx.budgetMin, max = ctx.budgetMax;
        String brand = ctx.brand;
        List<Product> found = query(categories, brand, min, max);
        if (found.isEmpty() && brand != null) {
            found = query(categories, null, min, max);
            if (!found.isEmpty()) s.note = "Hãng bạn chọn chưa có mẫu đúng yêu cầu, mình gợi ý hãng khác tương đương.";
        }
        if (found.isEmpty() && (min != null || max != null)) {
            found = query(categories, null, null, max == null ? null : Math.round(max * 1.3));
            if (!found.isEmpty()) s.note = "Không có mẫu nằm gọn trong ngân sách, đây là các mẫu gần nhất.";
        }
        if (found.isEmpty() && (min != null || max != null)) {
            found = query(categories, null, null, null);
            if (!found.isEmpty()) s.note = "Các mẫu hiện có đều ngoài ngân sách bạn đưa ra, bạn tham khảo nhé.";
        }
        List<Scored> scored = new ArrayList<>();
        for (Product p : found) scored.add(score(p, ctx));
        Comparator<Scored> order = Comparator.comparingDouble(Scored::score).reversed();
        scored.sort(order);
        s.products = scored.stream().limit(3).toList();
        return s;
    }

    private List<String> categoriesOf(AiContext ctx) {
        if ("camera".equals(ctx.device) || ctx.device == null) {
            if ("OUTDOOR".equals(ctx.placement)) return List.of("camera-ngoai-troi");
            if ("INDOOR".equals(ctx.placement)) return List.of("camera-wifi-trong-nha");
            return List.of("camera-wifi-trong-nha", "camera-ngoai-troi");
        }
        return DEVICE_CATEGORIES.getOrDefault(ctx.device, List.of());
    }

    private List<Product> query(List<String> categories, String brand, Long min, Long max) {
        List<Product> out = new ArrayList<>();
        for (String slug : categories.isEmpty() ? Collections.<String>singletonList(null) : categories) {
            out.addAll(productRepository.findAll(ProductSpecifications.filter(null, slug, brand,
                    min == null ? null : BigDecimal.valueOf(min), max == null ? null : BigDecimal.valueOf(max),
                    null, null, null, "best_selling"), PageRequest.of(0, 30)).getContent());
        }
        return out;
    }

    private Scored score(Product p, AiContext ctx) {
        Map<String, String> spec = new HashMap<>();
        p.getSpecs().forEach(s -> spec.put(s.getSpecKey(), plain(s.getSpecValue())));
        String all = plain(p.getName() + " " + Objects.toString(p.getShortDescription(), "") + " " + String.join(" ", spec.values()));
        List<String> matched = new ArrayList<>();
        for (String f : ctx.features) {
            if (hasFeature(f, spec, all)) matched.add(f);
        }
        double score = matched.size() * 3.0;
        if (ctx.minMp != null) {
            int mp = parseInt(spec.get("resolution_mp"));
            score += mp >= ctx.minMp ? 2 : -1;
        }
        if (ctx.brand != null && p.getBrand() != null && ctx.brand.equals(p.getBrand().getSlug())) score += 3;
        score += Math.log(p.getSoldCount() + 1) * 0.4;
        double millions = p.getEffectivePrice().doubleValue() / 1_000_000;
        if ("cheap".equals(ctx.pricePref)) score -= millions * 0.8;
        if ("premium".equals(ctx.pricePref)) score += millions * 0.5;
        if (p.getSalePrice() != null) score += 0.3;
        if (p.getStock() <= 0) score -= 5;
        return new Scored(p, score, matched);
    }

    private static boolean hasFeature(String f, Map<String, String> spec, String all) {
        return switch (f) {
            case "night_color" -> spec.getOrDefault("night_vision", "").contains("mau") || all.contains("co mau")
                    || all.contains("full color") || all.contains("colorvu");
            case "night_vision" -> spec.containsKey("night_distance_m") || all.contains("hong ngoai") || all.contains("ban dem");
            case "two_way_audio" -> all.contains("dam thoai") || all.contains("2 chieu") || all.contains("hai chieu");
            case "pan_tilt" -> spec.containsKey("pan_tilt") || all.contains("xoay");
            case "waterproof" -> spec.containsKey("ip_rating") || all.contains("chong nuoc");
            case "ai_detection" -> spec.containsKey("ai_detection") || all.contains("phat hien nguoi");
            case "wireless" -> spec.getOrDefault("connectivity", "").contains("wifi") || all.contains("wifi");
            case "battery" -> spec.containsKey("battery") || spec.getOrDefault("power", "").contains("pin");
            case "sim_4g" -> all.contains("4g");
            case "fingerprint" -> all.contains("van tay");
            case "face_id" -> all.contains("khuon mat");
            case "cloud" -> all.contains("cloud");
            default -> false;
        };
    }

    // ================================================================ GIÁ & SO SÁNH

    private List<Product> productsByCodesOrBrand(AiContext ctx, int limit) {
        LinkedHashMap<Long, Product> out = new LinkedHashMap<>();
        for (String code : ctx.productCodes) {
            productRepository.findAll(ProductSpecifications.filter(code, null, null, null, null, null, null, null, "best_selling"),
                    PageRequest.of(0, 1)).forEach(p -> out.putIfAbsent(p.getId(), p));
        }
        List<String> brands = !ctx.brands.isEmpty() ? ctx.brands : (ctx.brand == null ? List.of() : List.of(ctx.brand));
        for (String b : brands) {
            if (out.size() >= limit) break;
            List<String> cats = ctx.device == null ? List.of() : categoriesOf(ctx);
            query(cats, b, null, null).stream().findFirst().ifPresent(p -> out.putIfAbsent(p.getId(), p));
        }
        return out.values().stream().limit(limit).toList();
    }

    private Reply priceQuery(AiContext ctx) {
        List<Product> list = productsByCodesOrBrand(ctx, 3);
        if (list.isEmpty()) {
            if (ctx.hasShoppingSignal()) return advise(ctx);
            Reply r = new Reply("Bạn muốn hỏi giá mẫu nào ạ? Gõ tên hoặc mã sản phẩm (ví dụ: Ezviz C6N, Tapo C200) để mình báo giá chính xác.");
            r.links.add(new Link("Xem bảng giá tất cả sản phẩm", "/products?sort=price_asc"));
            return r;
        }
        Reply r = new Reply();
        StringBuilder sb = new StringBuilder("Giá hiện tại tại " + shopName + ":");
        for (Product p : list) {
            sb.append("\n• ").append(p.getName()).append(": ").append(vnd(p.getEffectivePrice()));
            if (p.getSalePrice() != null) {
                int off = (int) Math.round(100 - p.getSalePrice().doubleValue() * 100 / p.getPrice().doubleValue());
                sb.append(" (giá gốc ").append(vnd(p.getPrice())).append(", đang giảm ").append(off).append("%)");
            }
            sb.append(p.getStock() > 0 ? " – còn hàng" : " – tạm hết hàng");
            r.products.add(ProductSummaryResponse.from(p));
        }
        long total = list.stream().mapToLong(p -> p.getEffectivePrice().longValue()).min().orElse(0);
        sb.append("\nĐơn từ ").append(vnd(BigDecimal.valueOf(freeShippingFrom))).append(" được miễn phí giao hàng.");
        if (total > 0 && list.size() == 1) r.quick.add("So sánh với mẫu khác");
        r.quick.add("Gặp tư vấn viên");
        r.text = sb.toString();
        return r;
    }

    private Reply compare(AiContext ctx) {
        List<Product> list = productsByCodesOrBrand(ctx, 3);
        if (list.size() < 2) {
            Reply r = new Reply("Bạn muốn so sánh những mẫu nào ạ? Gõ 2 tên hoặc mã sản phẩm, ví dụ: \"so sánh Ezviz C6N và Tapo C200\".");
            list.forEach(p -> r.products.add(ProductSummaryResponse.from(p)));
            return r;
        }
        Reply r = new Reply();
        StringBuilder sb = new StringBuilder("So sánh nhanh:");
        Product cheapest = null, sharpest = null;
        int bestMp = -1;
        for (Product p : list) {
            Map<String, String> spec = new LinkedHashMap<>();
            p.getSpecs().forEach(s -> spec.put(s.getSpecKey(), s.getSpecValue()));
            sb.append("\n• ").append(p.getName()).append(": ").append(vnd(p.getEffectivePrice()));
            if (spec.containsKey("resolution_mp")) sb.append(" · ").append(spec.get("resolution_mp")).append("MP");
            if (spec.containsKey("night_distance_m")) sb.append(" · nhìn đêm ").append(spec.get("night_distance_m")).append("m");
            if (spec.containsKey("ip_rating")) sb.append(" · ").append(spec.get("ip_rating"));
            if (spec.containsKey("pan_tilt")) sb.append(" · xoay");
            if (spec.containsKey("unlock_methods")) sb.append(" · ").append(spec.get("unlock_methods"));
            sb.append(" · bảo hành ").append(p.getWarrantyMonths()).append(" tháng");
            if (cheapest == null || p.getEffectivePrice().compareTo(cheapest.getEffectivePrice()) < 0) cheapest = p;
            int mp = parseInt(spec.get("resolution_mp"));
            if (mp > bestMp) { bestMp = mp; sharpest = p; }
            r.products.add(ProductSummaryResponse.from(p));
        }
        sb.append("\n👉 Tiết kiệm nhất: ").append(cheapest.getName()).append(".");
        if (bestMp > 0 && sharpest != cheapest) sb.append(" Hình nét nhất: ").append(sharpest.getName()).append(".");
        sb.append("\nBạn cho mình biết nơi lắp đặt và nhu cầu, mình sẽ chọn giúp mẫu hợp nhất nhé.");
        r.quick.add("Gặp tư vấn viên");
        r.text = sb.toString();
        return r;
    }

    // ================================================================ CÂU HỎI THƯỜNG GẶP (lấy số liệu từ cấu hình)

    private Reply greeting(UserPrincipal me) {
        String name = me != null ? " " + lastName(me.fullName()) : "";
        Reply r = new Reply("Chào bạn" + name + "! 👋 Mình là trợ lý AI của " + shopName + ". Mình có thể gợi ý camera, "
                + "khóa cửa, chuông cửa... theo nhu cầu và ngân sách, báo giá, so sánh mẫu, giải đáp giao hàng, bảo hành. Bạn cần gì ạ?");
        r.quick.addAll(STARTERS);
        return r;
    }

    private Reply shipping() {
        Reply r = new Reply("🚚 Giao hàng toàn quốc, được kiểm tra hàng trước khi nhận.\n"
                + "• Miễn phí giao hàng cho đơn từ " + vnd(BigDecimal.valueOf(freeShippingFrom)) + ".\n"
                + "• Đơn dưới mức đó phí " + vnd(BigDecimal.valueOf(shippingFee)) + ".\n"
                + "• Thời gian: nội thành 1–2 ngày, tỉnh khác 2–5 ngày sau khi shop xác nhận đơn.");
        r.quick.addAll(List.of("Thanh toán thế nào?", "Bảo hành bao lâu?"));
        return r;
    }

    private Reply warranty() {
        Reply r = new Reply("🛡️ Sản phẩm chính hãng, bảo hành theo từng mẫu (thường 12–24 tháng, ghi rõ ở trang sản phẩm).\n"
                + "• Đổi mới trong 7 ngày nếu lỗi do nhà sản xuất.\n"
                + "• Mang tới cửa hàng hoặc gửi bảo hành qua đường bưu điện, hotline " + hotline + " hỗ trợ.");
        r.quick.addAll(List.of("Địa chỉ cửa hàng", "Gặp tư vấn viên"));
        return r;
    }

    private Reply installation() {
        Reply r = new Reply("🔧 Phần lớn camera WiFi tự lắp được: cắm điện, cài app của hãng (Ezviz, Imou, Tapo...) và quét mã QR là xem được.\n"
                + "• Cần khảo sát / lắp đặt tận nơi (nhiều mắt, đi dây, khóa cửa): gửi yêu cầu ở trang Liên hệ, chủ đề \"Khảo sát, lắp đặt\", shop báo phí trước khi làm.\n"
                + "• Gặp khó khi cài đặt: chat với tư vấn viên để được hướng dẫn từng bước.");
        r.links.add(new Link("Gửi yêu cầu lắp đặt", "/contact"));
        r.quick.add("Gặp tư vấn viên");
        return r;
    }

    private Reply payment() {
        Reply r = new Reply("💳 Shop nhận 2 cách thanh toán:\n"
                + "• Tiền mặt khi nhận hàng (COD).\n"
                + "• Chuyển khoản: " + bankName + " – " + bankAccount + " – " + bankHolder + " (nội dung: mã đơn hàng).\n"
                + "Hiện chưa hỗ trợ trả góp và ví điện tử.");
        r.quick.add("Phí giao hàng thế nào?");
        return r;
    }

    private Reply orderStatus(UserPrincipal me) {
        if (me == null || me.role() != Role.CUSTOMER) {
            Reply r = new Reply("Bạn đăng nhập để mình kiểm tra đơn hàng giúp nhé. Sau khi đăng nhập, mọi đơn đều có trong mục \"Đơn hàng của tôi\".");
            r.links.add(new Link("Đăng nhập", "/login"));
            r.action = "LOGIN_REQUIRED";
            return r;
        }
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDescIdDesc(me.id(), PageRequest.of(0, 1)).getContent();
        if (orders.isEmpty()) {
            Reply r = new Reply("Bạn chưa có đơn hàng nào. Cần mình tư vấn chọn thiết bị không ạ?");
            r.quick.addAll(STARTERS.subList(0, 2));
            return r;
        }
        Order o = orders.get(0);
        Reply r = new Reply("📦 Đơn gần nhất của bạn: " + o.getOrderCode() + "\n"
                + "• Trạng thái: " + o.getStatus().label() + "\n"
                + "• Tổng tiền: " + vnd(o.getTotal()) + "\n"
                + "• Đặt lúc: " + o.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")));
        r.links.add(new Link("Xem chi tiết đơn " + o.getOrderCode(), "/account/orders/" + o.getId()));
        r.links.add(new Link("Tất cả đơn hàng", "/account/orders"));
        return r;
    }

    private Reply storeInfo() {
        Reply r = new Reply("🏪 " + shopName + "\n• Địa chỉ: " + address + "\n• Giờ mở cửa: " + hours
                + "\n• Hotline: " + hotline + "\n• Email: " + email);
        r.links.add(new Link("Xem bản đồ", "/contact"));
        return r;
    }

    private Reply promotion() {
        List<Product> sale = productRepository.findAll(ProductSpecifications.filter(null, null, null, null, null, null, null,
                true, "best_selling"), PageRequest.of(0, 20)).getContent().stream()
                .sorted(Comparator.comparingDouble((Product p) -> p.getSalePrice().doubleValue() / p.getPrice().doubleValue()))
                .limit(3).toList();
        Reply r = new Reply();
        if (sale.isEmpty()) {
            r.text = "Hiện chưa có chương trình giảm giá. Đơn từ " + vnd(BigDecimal.valueOf(freeShippingFrom)) + " vẫn được miễn phí giao hàng nhé!";
            return r;
        }
        StringBuilder sb = new StringBuilder("🔥 Đang giảm giá nhiều nhất:");
        for (Product p : sale) {
            int off = (int) Math.round(100 - p.getSalePrice().doubleValue() * 100 / p.getPrice().doubleValue());
            sb.append("\n• ").append(p.getName()).append(": ").append(vnd(p.getSalePrice())).append(" (-").append(off).append("%)");
            r.products.add(ProductSummaryResponse.from(p));
        }
        sb.append("\nCộng thêm miễn phí giao hàng cho đơn từ ").append(vnd(BigDecimal.valueOf(freeShippingFrom))).append(".");
        r.text = sb.toString();
        r.links.add(new Link("Xem tất cả sản phẩm giảm giá", "/products?onSale=true"));
        return r;
    }

    private Reply techSupport(AiContext ctx) {
        String tips = "smart_lock".equals(ctx.device)
                ? "• Khóa báo pin yếu: thay pin AA mới cùng loại; hết pin hẳn thì cấp điện tạm qua cổng USB khẩn cấp hoặc dùng chìa cơ.\n"
                + "• Không nhận vân tay: lau sạch cảm biến và ngón tay, thêm lại vân tay ở nhiều góc."
                : "• Camera offline: kiểm tra WiFi 2.4GHz còn mạng, rút điện camera 10 giây rồi cắm lại.\n"
                + "• Đổi WiFi/mật khẩu: reset camera (giữ nút reset ~5 giây) rồi thêm lại trong app.\n"
                + "• Không xem lại được: kiểm tra thẻ nhớ đã được định dạng trong app chưa.";
        Reply r = new Reply("🛠️ Bạn thử vài bước nhanh sau:\n" + tips + "\nVẫn chưa được thì tư vấn viên kỹ thuật sẽ hỗ trợ trực tiếp (có thể gọi video để xem tận nơi).");
        r.quick.add("Gặp tư vấn viên");
        return r;
    }

    private Reply aboutBot() {
        Reply r = new Reply("🤖 Mình là trợ lý AI của " + shopName + ", được huấn luyện để hiểu câu hỏi tiếng Việt (có dấu, không dấu, viết tắt). "
                + "Mình giúp được: gợi ý thiết bị theo nhu cầu và ngân sách, báo giá, so sánh, giải đáp giao hàng, bảo hành, thanh toán, kiểm tra đơn hàng. "
                + "Câu nào khó, mình chuyển ngay cho tư vấn viên là người thật.");
        r.quick.addAll(STARTERS.subList(0, 3));
        return r;
    }

    private Reply outOfScope() {
        Reply r = new Reply("Câu này nằm ngoài chuyên môn của mình rồi 😅. Mình chỉ hỗ trợ về thiết bị an ninh của "
                + shopName + ": camera, khóa cửa thông minh, chuông cửa, báo động. Bạn cần tư vấn gì không ạ?");
        r.quick.addAll(STARTERS);
        return r;
    }

    private Reply fallback(List<AiChatLog> history) {
        boolean twice = !history.isEmpty() && "fallback".equals(storedIntent(history.get(0)));
        Reply r = new Reply(twice
                ? "Xin lỗi, mình vẫn chưa hiểu ý bạn 😅. Để tư vấn viên hỗ trợ bạn trực tiếp nhé?"
                : "Xin lỗi, mình chưa hiểu rõ ý bạn. Mình chuyên tư vấn thiết bị an ninh (camera, khóa cửa, chuông cửa, báo động). Bạn thử hỏi kiểu:");
        if (twice) r.quick.add("Gặp tư vấn viên");
        else r.quick.addAll(STARTERS);
        return r;
    }

    // ================================================================ CHUYỂN TƯ VẤN VIÊN

    private Reply handoff(UserPrincipal me, String sessionId, AiContext ctx, List<AiChatLog> history) {
        if (me == null || me.role() != Role.CUSTOMER) {
            Reply r = new Reply("Bạn đăng nhập để chat với tư vấn viên nhé (lịch sử trò chuyện sẽ được lưu lại). "
                    + "Hoặc gọi ngay hotline " + hotline + ".");
            r.links.add(new Link("Đăng nhập", "/login"));
            r.action = "LOGIN_REQUIRED";
            return r;
        }
        chatService.handoffFromAi(me, summaryFor(ctx, history));
        Reply r = new Reply("Mình đã chuyển bạn sang tư vấn viên kèm tóm tắt nhu cầu, bạn không cần nhắc lại từ đầu. Tư vấn viên sẽ trả lời ngay ạ!");
        r.action = "HANDOFF";
        return r;
    }

    /** Tóm tắt cho tư vấn viên: nhu cầu + mẫu AI đã gợi ý + vài câu khách hỏi gần nhất. */
    private String summaryFor(AiContext ctx, List<AiChatLog> history) {
        StringBuilder sb = new StringBuilder();
        if (!ctx.isEmpty()) sb.append("Khách cần ").append(describe(ctx)).append(". ");
        List<Long> suggested = new ArrayList<>();
        for (AiChatLog l : history) {
            if (l.getSuggestedProductIds() != null && !l.getSuggestedProductIds().isEmpty()) {
                suggested.addAll(l.getSuggestedProductIds());
                break;
            }
        }
        if (!suggested.isEmpty()) {
            String names = productRepository.findAllById(suggested).stream().map(Product::getName).collect(Collectors.joining(", "));
            sb.append("AI đã gợi ý: ").append(names).append(". ");
        }
        List<String> questions = history.stream().map(AiChatLog::getUserMessage)
                .filter(m -> !m.startsWith("[Bấm nút]")).limit(3).collect(Collectors.toList());
        Collections.reverse(questions);
        if (!questions.isEmpty()) sb.append("Khách đã hỏi: \"").append(String.join("\", \"", questions)).append("\".");
        String s = sb.toString().trim();
        return s.isEmpty() ? "Khách muốn gặp tư vấn viên (chưa nói rõ nhu cầu với trợ lý AI)." : s;
    }

    // ================================================================ TIỆN ÍCH

    private String describe(AiContext ctx) {
        List<String> parts = new ArrayList<>();
        String dev = DEVICE_LABEL.getOrDefault(ctx.device, "thiết bị an ninh");
        if ("camera".equals(ctx.device) && "OUTDOOR".equals(ctx.placement)) dev = "camera ngoài trời";
        else if ("camera".equals(ctx.device) && "INDOOR".equals(ctx.placement)) dev = "camera trong nhà";
        parts.add(dev);
        if (ctx.location != null && !"home".equals(ctx.location)) parts.add("cho " + LOCATION_LABEL.get(ctx.location));
        ctx.features.forEach(f -> parts.add(FEATURE_LABEL.getOrDefault(f, f)));
        if (ctx.minMp != null) parts.add("từ " + ctx.minMp + "MP");
        if (ctx.brand != null) parts.add("hãng " + ctx.brand);
        if (ctx.budgetMin != null && ctx.budgetMax != null) parts.add("ngân sách " + vnd(BigDecimal.valueOf(ctx.budgetMin)) + " – " + vnd(BigDecimal.valueOf(ctx.budgetMax)));
        else if (ctx.budgetMax != null) parts.add("ngân sách dưới " + vnd(BigDecimal.valueOf(ctx.budgetMax)));
        else if (ctx.budgetMin != null) parts.add("ngân sách trên " + vnd(BigDecimal.valueOf(ctx.budgetMin)));
        if ("cheap".equals(ctx.pricePref)) parts.add("ưu tiên giá rẻ");
        if (ctx.quantity != null) parts.add(ctx.quantity + " thiết bị");
        if (ctx.floors != null) parts.add("nhà " + ctx.floors + " tầng");
        return String.join(" · ", parts);
    }

    private String listUrl(AiContext ctx) {
        List<String> cats = categoriesOf(ctx);
        StringBuilder url = new StringBuilder("/products?sort=best_selling");
        if (cats.size() == 1) url.append("&category=").append(cats.get(0));
        if (ctx.brand != null) url.append("&brand=").append(ctx.brand);
        return url.toString();
    }

    private AiReply finish(AiChatLog entry, Reply r, ObjectNode entities, long started) {
        entry.setBotReply(r.text);
        entry.setHandedOff("HANDOFF".equals(r.action));
        if (entities != null) entry.setEntities(entities);
        if (!r.products.isEmpty()) entry.setSuggestedProductIds(r.products.stream().map(ProductSummaryResponse::id).toList());
        entry.setResponseMs((int) (System.currentTimeMillis() - started));
        logRepository.save(entry);
        String intent = entities == null ? null : entities.path("_intent").asText(null);
        Double conf = entry.getConfidence() == null ? null : entry.getConfidence().doubleValue();
        return new AiReply(entry.getId(), r.text, r.products, r.quick.stream().distinct().limit(5).toList(), r.links,
                intent, conf, r.action);
    }

    private static final class Reply {
        String text;
        List<ProductSummaryResponse> products = new ArrayList<>();
        List<String> quick = new ArrayList<>();
        List<Link> links = new ArrayList<>();
        String action;

        Reply() {
        }

        Reply(String text) {
            this.text = text;
        }
    }

    private void checkSession(String sessionId) {
        if (sessionId == null || !sessionId.matches("^[A-Za-z0-9_-]{8,64}$")) {
            throw ApiException.badRequest("Phiên chat không hợp lệ, hãy tải lại trang");
        }
    }

    private void checkRate(String sessionId) {
        long now = System.currentTimeMillis();
        Deque<Long> q = rate.computeIfAbsent(sessionId, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > 60_000) q.pollFirst();
            if (q.size() >= MAX_PER_MINUTE) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Bạn hỏi hơi nhanh, đợi vài giây rồi hỏi tiếp nhé.");
            }
            q.addLast(now);
        }
        if (rate.size() > 10_000) rate.clear(); // tránh phình bộ nhớ
    }

    private JsonNode readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private static String plain(String s) {
        if (s == null) return "";
        String t = s.replace('đ', 'd').replace('Đ', 'D');
        return Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    private static int parseInt(String s) {
        if (s == null) return -1;
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static String lastName(String fullName) {
        String[] parts = fullName.trim().split("\\s+");
        return parts[parts.length - 1];
    }

    private static String vnd(BigDecimal amount) {
        DecimalFormat f = new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(VI));
        return f.format(amount) + " ₫";
    }
}
