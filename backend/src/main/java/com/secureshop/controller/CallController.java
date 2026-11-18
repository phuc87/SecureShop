package com.secureshop.controller;

import com.secureshop.dto.call.CallEvent;
import com.secureshop.entity.enums.CallType;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.CallService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Điều khiển cuộc gọi video (khách hàng và tư vấn viên đều dùng; quyền theo hội thoại kiểm tra trong CallService).
 * Dữ liệu WebRTC (offer/answer/ICE) không đi qua đây mà qua STOMP /app/call.signal cho nhanh.
 */
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    public record StartCallRequest(@NotNull(message = "Thiếu hội thoại") Long conversationId, CallType type) {
    }

    /** POST /api/calls { conversationId, type: VIDEO|AUDIO } -> CALL_OUTGOING (callId) */
    @PostMapping
    public CallEvent start(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody StartCallRequest req) {
        return callService.start(me, req.conversationId(), req.type() == null ? CallType.VIDEO : req.type());
    }

    @PostMapping("/{id}/accept")
    public CallEvent accept(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return callService.accept(me, id);
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        callService.reject(me, id);
    }

    /** Gác máy (hoặc huỷ khi đang đổ chuông). */
    @PostMapping("/{id}/end")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void end(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        callService.hangUp(me, id);
    }
}
