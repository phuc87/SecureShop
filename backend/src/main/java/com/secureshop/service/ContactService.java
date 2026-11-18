package com.secureshop.service;

import com.secureshop.dto.contact.ContactRequest;
import com.secureshop.dto.contact.ContactResponse;
import com.secureshop.entity.ContactMessage;
import com.secureshop.entity.enums.ContactStatus;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.ContactMessageRepository;
import com.secureshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContactService {

    /** Một email gửi tối đa 3 tin trong 10 phút. */
    private static final int MAX_PER_WINDOW = 3;
    private static final int WINDOW_MINUTES = 10;

    private final ContactMessageRepository contactRepository;
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher events;

    public record ContactSubmitted(Long contactId) {
    }

    @Transactional
    public ContactResponse submit(ContactRequest req, Long currentUserId) {
        String email = req.email().trim().toLowerCase();
        long recent = contactRepository.countByEmailIgnoreCaseAndCreatedAtAfter(
                email, LocalDateTime.now().minusMinutes(WINDOW_MINUTES));
        if (recent >= MAX_PER_WINDOW) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã gửi nhiều tin liên tiếp, vui lòng thử lại sau ít phút hoặc gọi hotline.");
        }

        ContactMessage msg = new ContactMessage();
        msg.setFullName(req.fullName().trim());
        msg.setEmail(email);
        msg.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone());
        msg.setSubject(req.subject());
        msg.setMessage(req.message().trim());
        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(msg::setUser);
        }
        contactRepository.save(msg);
        log.info("Tin liên hệ mới #{} từ {} ({})", msg.getId(), email, req.subject());
        events.publishEvent(new ContactSubmitted(msg.getId())); // gửi email báo shop sau khi lưu (AccountMailListener)
        return ContactResponse.from(msg);
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> list(ContactStatus status) {
        List<ContactMessage> items = status == null
                ? contactRepository.findAllByOrderByCreatedAtDesc()
                : contactRepository.findByStatusOrderByCreatedAtDesc(status);
        return items.stream().map(ContactResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public long countNew() {
        return contactRepository.countByStatus(ContactStatus.NEW);
    }

    @Transactional
    public ContactResponse updateStatus(Long id, ContactStatus status, Long adminId) {
        ContactMessage msg = contactRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tin liên hệ"));
        msg.setStatus(status);
        if (status == ContactStatus.HANDLED) {
            msg.setHandledBy(userRepository.getReferenceById(adminId));
            msg.setHandledAt(LocalDateTime.now());
        } else {
            msg.setHandledBy(null);
            msg.setHandledAt(null);
        }
        contactRepository.flush();
        return ContactResponse.from(contactRepository.findById(id).orElseThrow());
    }
}
