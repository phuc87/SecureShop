package com.secureshop.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.secureshop.dto.PageResponse;
import com.secureshop.entity.AiChatLog;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.AiChatLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Trang quản trị "Trợ lý AI": thống kê, xem lịch sử, sửa nhãn câu AI hiểu sai, dạy lại AI.
 * Vòng lặp cải thiện: khách hỏi -> AI trả lời -> admin xem câu bị 👎 / độ tin cậy thấp -> gán nhãn đúng
 *                    -> bấm "Dạy lại AI" -> model học thêm các câu đó -> lần sau trả lời đúng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAiService {

    public static final double LOW_CONFIDENCE = 0.6;

    private final AiChatLogRepository logRepository;
    private final AiClient aiClient;

    public record LogRow(Long id, LocalDateTime createdAt, String userMessage, String predictedIntent, Double confidence,
                         String resolvedIntent, String botReply, String feedback, String correctedIntent,
                         boolean handedOff, Long userId, String sessionId, Integer responseMs, int productCount) {
        static LogRow from(AiChatLog l) {
            String resolved = l.getEntities() == null ? null : l.getEntities().path("_intent").asText(null);
            String reply = l.getBotReply();
            if (reply != null && reply.length() > 400) reply = reply.substring(0, 400) + "…";
            return new LogRow(l.getId(), l.getCreatedAt(), l.getUserMessage(), l.getPredictedIntent(),
                    l.getConfidence() == null ? null : l.getConfidence().doubleValue(), resolved, reply, l.getFeedback(),
                    l.getCorrectedIntent(), l.isHandedOff(), l.getUserId(), l.getSessionId(), l.getResponseMs(),
                    l.getSuggestedProductIds() == null ? 0 : l.getSuggestedProductIds().size());
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        Map<String, Object> out = new LinkedHashMap<>();
        Optional<JsonNode> health = aiClient.health();
        out.put("online", health.isPresent());
        health.ifPresent(h -> out.put("model", h));
        aiClient.metrics().ifPresent(m -> {
            out.put("perIntentF1", m.path("per_intent_f1"));
            out.put("mistakes", m.path("mistakes"));
        });
        long total = logRepository.count();
        out.put("total", total);
        out.put("last7Days", logRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7)));
        out.put("good", logRepository.countByFeedback("GOOD"));
        out.put("bad", logRepository.countByFeedback("BAD"));
        out.put("handoffs", logRepository.countByHandedOffTrue());
        out.put("lowConfidence", logRepository.countByConfidenceLessThan(BigDecimal.valueOf(LOW_CONFIDENCE)));
        out.put("labeled", logRepository.countByCorrectedIntentIsNotNull());
        Double avg = logRepository.averageConfidence();
        out.put("avgConfidence", avg == null ? null : Math.round(avg * 1000) / 1000.0);
        List<Map<String, Object>> intents = new ArrayList<>();
        for (Object[] row : logRepository.countByIntent()) intents.add(Map.of("intent", row[0], "count", row[1]));
        out.put("intents", intents);
        return out;
    }

    /** filter: all | bad | low | labeled | unlabeled-bad */
    @Transactional(readOnly = true)
    public PageResponse<LogRow> logs(String filter, String intent, String q, int page, int size) {
        Specification<AiChatLog> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if ("bad".equals(filter)) ps.add(cb.equal(root.get("feedback"), "BAD"));
            if ("low".equals(filter)) ps.add(cb.lessThan(root.get("confidence"), BigDecimal.valueOf(LOW_CONFIDENCE)));
            if ("labeled".equals(filter)) ps.add(cb.isNotNull(root.get("correctedIntent")));
            if ("handoff".equals(filter)) ps.add(cb.isTrue(root.get("handedOff")));
            if (intent != null && !intent.isBlank()) ps.add(cb.equal(root.get("predictedIntent"), intent));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("userMessage")), "%" + q.trim().toLowerCase() + "%"));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by(Sort.Direction.DESC, "id"));
        return PageResponse.from(logRepository.findAll(spec, pr), LogRow::from);
    }

    @Transactional
    public LogRow label(Long id, String intent) {
        AiChatLog l = logRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi"));
        if (intent != null && !intent.isBlank() && !knownIntents().contains(intent)) {
            throw ApiException.badRequest("Intent không tồn tại: " + intent);
        }
        l.setCorrectedIntent(intent == null || intent.isBlank() ? null : intent);
        return LogRow.from(l);
    }

    public List<Map<String, Object>> intents() {
        List<Map<String, Object>> out = new ArrayList<>();
        aiClient.intents().ifPresent(arr -> arr.forEach(n -> out.add(Map.of(
                "intent", n.path("intent").asText(), "description", n.path("description").asText(),
                "examples", n.path("examples").asInt()))));
        return out;
    }

    private Set<String> knownIntents() {
        Set<String> set = new HashSet<>();
        intents().forEach(m -> set.add((String) m.get("intent")));
        if (set.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI service đang tắt, chưa lấy được danh sách intent");
        return set;
    }

    /** Dữ liệu train lấy từ thực tế: câu admin đã sửa nhãn + câu khách bấm 👍 (AI hiểu đúng). */
    @Transactional(readOnly = true)
    public List<Map<String, String>> trainingExamples() {
        List<Map<String, String>> out = new ArrayList<>();
        for (AiChatLog l : logRepository.findLabeled()) {
            String label = l.getCorrectedIntent() != null ? l.getCorrectedIntent() : l.getPredictedIntent();
            if (l.getUserMessage().startsWith("[Bấm nút]")) continue;
            out.add(Map.of("text", l.getUserMessage(), "intent", label));
        }
        return out;
    }

    public JsonNode retrain() {
        List<Map<String, String>> examples = trainingExamples();
        JsonNode result = aiClient.retrain(examples)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI service đang tắt hoặc train lỗi. Hãy chạy start-ai.bat"));
        log.info("Đã dạy lại AI với {} câu thực tế: {}", examples.size(), result);
        return result;
    }

    /** CSV (text,intent) để tải về, dùng train model khác (vd. PhoBERT). */
    public String exportCsv() {
        StringBuilder sb = new StringBuilder("﻿text,intent\n"); // BOM để Excel đọc đúng tiếng Việt
        for (Map<String, String> e : trainingExamples()) {
            sb.append('"').append(e.get("text").replace("\"", "\"\"").replace("\n", " ")).append("\",").append(e.get("intent")).append('\n');
        }
        return sb.toString();
    }
}
