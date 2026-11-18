package com.secureshop.controller;

import com.secureshop.ai.AiAssistantService;
import com.secureshop.ai.AiClient;
import com.secureshop.dto.ai.AiReply;
import com.secureshop.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Trợ lý AI cho khách (kể cả khách chưa đăng nhập). sessionId do trình duyệt tạo, lưu ở localStorage. */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiAssistantService assistant;
    private final AiClient aiClient;

    public record AskRequest(@NotBlank(message = "Thiếu phiên chat") String sessionId,
                             @NotBlank(message = "Bạn chưa nhập câu hỏi") @Size(max = 500, message = "Câu hỏi tối đa 500 ký tự") String message) {
    }

    public record FeedbackRequest(@NotBlank String sessionId, @NotNull Long logId, @NotBlank String value) {
    }

    public record SessionRequest(@NotBlank String sessionId) {
    }

    /** POST /api/ai/ask { sessionId, message } -> câu trả lời + sản phẩm gợi ý + nút gợi ý */
    @PostMapping("/ask")
    public AiReply ask(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody AskRequest req) {
        return assistant.ask(me, req.sessionId(), req.message());
    }

    /** Khách bấm "Gặp tư vấn viên". */
    @PostMapping("/handoff")
    public AiReply handoff(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody SessionRequest req) {
        return assistant.handoffButton(me, req.sessionId());
    }

    /** 👍 / 👎: value = GOOD | BAD */
    @PostMapping("/feedback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void feedback(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody FeedbackRequest req) {
        assistant.feedback(me, req.sessionId(), req.logId(), req.value());
    }

    /** AI service đang chạy không (để giao diện hiện "Trợ lý AI tạm nghỉ"). */
    @GetMapping("/status")
    public Map<String, Object> status() {
        return aiClient.health()
                .<Map<String, Object>>map(h -> Map.of("online", true, "modelVersion", h.path("model_version").asText("")))
                .orElse(Map.of("online", false));
    }
}
