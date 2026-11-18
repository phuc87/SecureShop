package com.secureshop.controller.admin;

import com.secureshop.dto.chat.ConversationResponse;
import com.secureshop.entity.enums.ConversationStatus;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Hộp thư tư vấn của admin. */
@RestController
@RequestMapping("/api/admin/chat")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminChatController {

    private final ChatService chatService;

    /** GET /api/admin/chat/conversations?status=WAITING&q=an */
    @GetMapping("/conversations")
    public List<ConversationResponse> list(@RequestParam(required = false) ConversationStatus status,
                                           @RequestParam(required = false) String q) {
        return chatService.listForAdmin(status, q);
    }

    @GetMapping("/conversations/{id}")
    public ConversationResponse get(@PathVariable Long id) {
        return chatService.getForAdmin(id);
    }

    @PostMapping("/conversations/{id}/close")
    public ConversationResponse close(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return chatService.close(me, id);
    }

    /** Tổng tin khách gửi mà admin chưa đọc (badge trên menu). */
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", chatService.totalUnreadForAdmin());
    }
}
