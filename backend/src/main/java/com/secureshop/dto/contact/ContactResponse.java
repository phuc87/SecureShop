package com.secureshop.dto.contact;

import com.secureshop.entity.ContactMessage;
import com.secureshop.entity.enums.ContactStatus;
import com.secureshop.entity.enums.ContactSubject;

import java.time.LocalDateTime;

public record ContactResponse(Long id, String fullName, String email, String phone, ContactSubject subject,
                              String message, ContactStatus status, String handledByName,
                              LocalDateTime handledAt, LocalDateTime createdAt) {

    public static ContactResponse from(ContactMessage c) {
        return new ContactResponse(c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getSubject(),
                c.getMessage(), c.getStatus(), c.getHandledBy() != null ? c.getHandledBy().getFullName() : null,
                c.getHandledAt(), c.getCreatedAt());
    }
}
