package com.secureshop.controller;

import com.secureshop.dto.chat.ConversationResponse;
import com.secureshop.dto.chat.MessagePage;
import com.secureshop.dto.chat.MessageResponse;
import com.secureshop.dto.chat.SendMessageRequest;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ChatService;
import com.secureshop.service.FileStorageService;
import com.secureshop.websocket.PresenceTracker;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/** API chat dùng chung cho khách và admin (quyền kiểm tra trong ChatService). Cần đăng nhập. */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final FileStorageService fileStorage;
    private final PresenceTracker presence;

    /** Khách mở khung chat: lấy (hoặc tạo) hội thoại của mình + biết có tư vấn viên online không. */
    @GetMapping("/my-conversation")
    public Map<String, Object> myConversation(@AuthenticationPrincipal UserPrincipal me) {
        return Map.of("conversation", chatService.getOrCreateForCustomer(me),
                "supportOnline", presence.isSupportOnline());
    }

    /** GET /api/chat/conversations/5/messages?before=120  (30 tin/lần) */
    @GetMapping("/conversations/{id}/messages")
    public MessagePage messages(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                @RequestParam(required = false) Long before) {
        return chatService.messages(me, id, before);
    }

    @PostMapping("/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse send(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                                @Valid @RequestBody SendMessageRequest request) {
        return chatService.send(me, id, request);
    }

    @PostMapping("/conversations/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        chatService.markRead(me, id);
    }

    /** Tải file lên trước (ảnh, ghi âm, video, tài liệu), sau đó gửi tin nhắn kèm fileUrl trả về. */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public FileStorageService.StoredFile upload(@RequestParam("file") MultipartFile file) {
        return fileStorage.storeChatFile(file);
    }
}
