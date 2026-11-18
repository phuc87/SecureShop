package com.secureshop.controller.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.secureshop.ai.AdminAiService;
import com.secureshop.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAiController {

    private final AdminAiService adminAiService;

    public record LabelRequest(String intent) {
    }

    @GetMapping("/overview")
    public Map<String, Object> overview() {
        return adminAiService.overview();
    }

    /** filter: all | bad | low | labeled | handoff */
    @GetMapping("/logs")
    public PageResponse<AdminAiService.LogRow> logs(@RequestParam(defaultValue = "all") String filter,
                                                    @RequestParam(required = false) String intent,
                                                    @RequestParam(required = false) String q,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "15") int size) {
        return adminAiService.logs(filter, intent, q, page, size);
    }

    @GetMapping("/intents")
    public List<Map<String, Object>> intents() {
        return adminAiService.intents();
    }

    /** Gán nhãn đúng cho 1 câu (intent = null để bỏ nhãn). */
    @PutMapping("/logs/{id}/label")
    public AdminAiService.LogRow label(@PathVariable Long id, @RequestBody LabelRequest req) {
        return adminAiService.label(id, req.intent());
    }

    /** Dạy lại AI bằng các câu đã gán nhãn + câu khách bấm 👍. */
    @PostMapping("/retrain")
    public JsonNode retrain() {
        return adminAiService.retrain();
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ai-training-data.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(adminAiService.exportCsv().getBytes(StandardCharsets.UTF_8));
    }
}
