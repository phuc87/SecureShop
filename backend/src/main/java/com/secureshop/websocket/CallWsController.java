package com.secureshop.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Signaling WebRTC: trình duyệt gửi lên /app/call.signal, server chuyển nguyên văn sang người bên kia
 * (qua /user/queue/call). kind = offer | answer | ice | media.
 */
@Controller
@RequiredArgsConstructor
public class CallWsController {

    private final CallService callService;

    public record SignalPayload(Long callId, String kind, JsonNode data) {
    }

    @MessageMapping("/call.signal")
    public void signal(SignalPayload payload, Principal principal) {
        if (payload == null || payload.callId() == null) return;
        if (principal instanceof UsernamePasswordAuthenticationToken auth && auth.getPrincipal() instanceof UserPrincipal me) {
            callService.relay(me, payload.callId(), payload.kind(), payload.data());
        }
    }
}
