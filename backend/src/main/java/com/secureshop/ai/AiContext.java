package com.secureshop.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;

/**
 * Nhu cầu của khách gom qua nhiều câu (ngữ cảnh hội thoại).
 * Ví dụ: "tư vấn camera" -> "ngoài trời" -> "dưới 2 triệu" => camera + OUTDOOR + budget_max 2.000.000.
 */
public class AiContext {

    public String device;
    public String placement;
    public Long budgetMin;
    public Long budgetMax;
    public String brand;
    public List<String> brands = new ArrayList<>();
    public Integer minMp;
    public Set<String> features = new LinkedHashSet<>();
    public String location;
    public Integer quantity;
    public Integer floors;
    public String pricePref;
    public List<String> productCodes = new ArrayList<>();

    public static AiContext from(JsonNode n) {
        AiContext c = new AiContext();
        if (n == null || n.isNull() || n.isMissingNode()) return c;
        c.device = text(n, "device");
        c.placement = text(n, "placement");
        c.budgetMin = n.hasNonNull("budget_min") ? n.get("budget_min").asLong() : null;
        c.budgetMax = n.hasNonNull("budget_max") ? n.get("budget_max").asLong() : null;
        c.brand = text(n, "brand");
        n.path("brands").forEach(b -> c.brands.add(b.asText()));
        c.minMp = n.hasNonNull("min_resolution_mp") ? n.get("min_resolution_mp").asInt() : null;
        n.path("features").forEach(f -> c.features.add(f.asText()));
        c.location = text(n, "location");
        c.quantity = n.hasNonNull("quantity") ? n.get("quantity").asInt() : null;
        c.floors = n.hasNonNull("floors") ? n.get("floors").asInt() : null;
        c.pricePref = text(n, "price_pref");
        n.path("product_codes").forEach(p -> c.productCodes.add(p.asText()));
        return c;
    }

    private static String text(JsonNode n, String key) {
        return n.hasNonNull(key) ? n.get(key).asText() : null;
    }

    public boolean isEmpty() {
        return device == null && placement == null && budgetMin == null && budgetMax == null && brand == null
                && minMp == null && features.isEmpty() && location == null && quantity == null && productCodes.isEmpty();
    }

    /** Có thông tin "đang chọn mua" (thiết bị, ngân sách, tính năng...) không. */
    public boolean hasShoppingSignal() {
        return device != null || budgetMin != null || budgetMax != null || !features.isEmpty() || minMp != null
                || placement != null || brand != null;
    }

    /**
     * Ghép câu mới vào ngữ cảnh cũ: thông tin mới ghi đè thông tin cũ.
     * Khách chuyển sang loại thiết bị KHÁC (khóa cửa -> camera) thì bắt đầu nhu cầu mới:
     * ngân sách, vị trí, tính năng của thiết bị cũ không áp cho thiết bị mới.
     */
    public static AiContext merge(AiContext older, AiContext newer) {
        if (older == null) return newer;
        if (newer.device != null && older.device != null && !newer.device.equals(older.device)) return newer;
        AiContext m = new AiContext();
        boolean deviceChanged = newer.device != null && older.device != null && !newer.device.equals(older.device);
        m.device = newer.device != null ? newer.device : older.device;
        m.placement = newer.placement != null ? newer.placement : (deviceChanged ? null : older.placement);
        boolean newBudget = newer.budgetMin != null || newer.budgetMax != null;
        m.budgetMin = newBudget ? newer.budgetMin : older.budgetMin;
        m.budgetMax = newBudget ? newer.budgetMax : older.budgetMax;
        m.brand = newer.brand != null ? newer.brand : (deviceChanged ? null : older.brand);
        m.brands = !newer.brands.isEmpty() ? newer.brands : older.brands;
        m.minMp = newer.minMp != null ? newer.minMp : (deviceChanged ? null : older.minMp);
        if (!deviceChanged) m.features.addAll(older.features);
        m.features.addAll(newer.features);
        m.location = newer.location != null ? newer.location : older.location;
        m.quantity = newer.quantity != null ? newer.quantity : older.quantity;
        m.floors = newer.floors != null ? newer.floors : older.floors;
        m.pricePref = newer.pricePref != null ? newer.pricePref : older.pricePref;
        m.productCodes = !newer.productCodes.isEmpty() ? newer.productCodes : older.productCodes;
        return m;
    }

    public ObjectNode toJson(ObjectMapper om) {
        ObjectNode n = om.createObjectNode();
        if (device != null) n.put("device", device);
        if (placement != null) n.put("placement", placement);
        if (budgetMin != null) n.put("budget_min", budgetMin);
        if (budgetMax != null) n.put("budget_max", budgetMax);
        if (brand != null) n.put("brand", brand);
        if (!brands.isEmpty()) brands.forEach(n.putArray("brands")::add);
        if (minMp != null) n.put("min_resolution_mp", minMp);
        if (!features.isEmpty()) features.forEach(n.putArray("features")::add);
        if (location != null) n.put("location", location);
        if (quantity != null) n.put("quantity", quantity);
        if (floors != null) n.put("floors", floors);
        if (pricePref != null) n.put("price_pref", pricePref);
        if (!productCodes.isEmpty()) productCodes.forEach(n.putArray("product_codes")::add);
        return n;
    }
}
