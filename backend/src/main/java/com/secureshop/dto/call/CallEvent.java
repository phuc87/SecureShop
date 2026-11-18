package com.secureshop.dto.call;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Sự kiện cuộc gọi, gửi riêng cho từng người qua /user/queue/call (và là kết quả của REST /api/calls).
 *  CALL_OUTGOING : (REST) mình vừa gọi, đang đổ chuông bên kia
 *  CALL_RING     : có người gọi tới mình
 *  CALL_ACCEPTED : bên kia đã bắt máy -> người gọi tạo offer WebRTC
 *  CALL_TAKEN    : cuộc gọi đã được nhận (ở tab khác / bởi tư vấn viên khác) -> tắt chuông
 *  CALL_REJECTED : bên kia từ chối
 *  CALL_MISSED   : không ai bắt máy / người gọi đã huỷ
 *  CALL_ENDED    : cuộc gọi kết thúc (gác máy hoặc mất kết nối)
 *  CALL_SIGNAL   : dữ liệu WebRTC chuyển tiếp (kind = offer | answer | ice | media)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CallEvent(String type, Long callId, Long conversationId, Long peerId, String peerName, String peerRole,
                        String callType, String kind, JsonNode data, String reason, Integer durationSeconds) {

    public static CallEvent of(String type, Long callId, Long conversationId) {
        return new CallEvent(type, callId, conversationId, null, null, null, null, null, null, null, null);
    }

    public static CallEvent withPeer(String type, Long callId, Long conversationId, Long peerId, String peerName,
                                     String peerRole, String callType) {
        return new CallEvent(type, callId, conversationId, peerId, peerName, peerRole, callType, null, null, null, null);
    }

    public static CallEvent ended(String type, Long callId, Long conversationId, String reason, Integer durationSeconds) {
        return new CallEvent(type, callId, conversationId, null, null, null, null, null, null, reason, durationSeconds);
    }

    public static CallEvent signal(Long callId, String kind, JsonNode data) {
        return new CallEvent("CALL_SIGNAL", callId, null, null, null, null, null, kind, data, null, null);
    }
}
