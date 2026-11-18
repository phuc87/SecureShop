package com.secureshop.mail;

import com.secureshop.service.AuthService;
import com.secureshop.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Email về tài khoản và liên hệ: gửi nền, chỉ sau khi dữ liệu đã lưu (AFTER_COMMIT). */
@Component
@RequiredArgsConstructor
public class AccountMailListener {

    private final EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPasswordReset(AuthService.PasswordResetRequested e) {
        emailService.sendPasswordReset(e.userId(), e.rawToken(), e.minutes());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onContact(ContactService.ContactSubmitted e) {
        emailService.sendContactNotice(e.contactId());
    }
}
