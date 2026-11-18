package com.secureshop.ai;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Gọi sang ai-service (Python). Mọi lỗi (service tắt, quá giờ) đều trả Optional.empty()
 * để web vẫn chạy bình thường, chỉ trợ lý AI báo "tạm nghỉ".
 */
@Slf4j
@Component
public class AiClient {

    private final RestClient client;
    private final RestClient slowClient; // train lại model mất vài giây

    public AiClient(@Value("${app.ai.url}") String url, @Value("${app.ai.key}") String key,
                    @Value("${app.ai.timeout-ms}") int timeoutMs) {
        this.client = build(url, key, timeoutMs);
        this.slowClient = build(url, key, 120_000);
    }

    private static RestClient build(String url, String key, int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.min(timeoutMs, 2000));
        factory.setReadTimeout(timeoutMs);
        return RestClient.builder().baseUrl(url).requestFactory(factory)
                .defaultHeader("X-AI-Key", key).build();
    }

    /** Kết quả phân tích 1 câu. entities: JSON gốc từ Python (device, placement, budget_max...). */
    public record Prediction(String intent, double confidence, List<Map<String, Object>> top,
                             JsonNode entities, String modelVersion) {
    }

    public Optional<Prediction> predict(String text) {
        try {
            JsonNode res = client.post().uri("/predict").contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", text)).retrieve().body(JsonNode.class);
            if (res == null) return Optional.empty();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> top = new com.fasterxml.jackson.databind.ObjectMapper()
                    .convertValue(res.path("top"), List.class);
            return Optional.of(new Prediction(res.path("intent").asText(), res.path("confidence").asDouble(),
                    top, res.path("entities"), res.path("model_version").asText(null)));
        } catch (Exception e) {
            log.warn("AI service không phản hồi: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<JsonNode> health() {
        return get("/health");
    }

    public Optional<JsonNode> metrics() {
        return get("/metrics");
    }

    public Optional<JsonNode> intents() {
        return get("/intents");
    }

    /** examples: [{text, intent}] -> train lại, trả về độ chính xác mới. */
    public Optional<JsonNode> retrain(List<Map<String, String>> examples) {
        try {
            return Optional.ofNullable(slowClient.post().uri("/retrain").contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("examples", examples)).retrieve().body(JsonNode.class));
        } catch (Exception e) {
            log.warn("Train lại AI thất bại: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<JsonNode> get(String path) {
        try {
            return Optional.ofNullable(client.get().uri(path).retrieve().body(JsonNode.class));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
