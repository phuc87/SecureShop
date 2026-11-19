package com.secureshop.websocket;

import com.secureshop.dto.chat.ChatEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Nơi duy nhất đẩy sự kiện chat qua WebSocket.
 * Kênh:
 *   /topic/admin/chat        : mọi admin (danh sách hội thoại + tin nhắn)
 *   /user/queue/chat         : riêng từng khách hàng
 *   /topic/public/support    : cho khách biết có tư vấn viên online không
 * Sự kiện chỉ được gửi SAU KHI transaction commit, để client không nhận tin chưa thực sự lưu vào DB.
 */
@Component
@RequiredArgsConstructor
public class ChatNotifier {

    public static final String ADMIN_TOPIC = "/topic/admin/chat";
    public static final String CUSTOMER_QUEUE = "/queue/chat";
    public static final String SUPPORT_TOPIC = "/topic/public/support";

    private final SimpMessagingTemplate messaging;

    public void toAdmins(ChatEvent event) {
        afterCommit(() -> messaging.convertAndSend(ADMIN_TOPIC, event));
    }

    /** customerUsername = email (tên Principal của phiên WebSocket). */
    public void toCustomer(String customerUsername, ChatEvent event) {
        afterCommit(() -> messaging.convertAndSendToUser(customerUsername, CUSTOMER_QUEUE, event));
    }

    /** Gửi riêng cho 1 người (mọi tab của họ). username = email. Dùng cho cuộc gọi: /queue/call */
    public void toUser(String username, String queue, Object payload) {
        afterCommit(() -> messaging.convertAndSendToUser(username, queue, payload));
    }

    /** Sự kiện khác cho mọi admin trên cùng kênh (vd. type = REVIEW khi khách vừa đánh giá). */
    public void toAdminsRaw(Object payload) {
        afterCommit(() -> messaging.convertAndSend(ADMIN_TOPIC, payload));
    }

    public void supportStatus(boolean online) {
        messaging.convertAndSend(SUPPORT_TOPIC, java.util.Map.of("online", online));
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
