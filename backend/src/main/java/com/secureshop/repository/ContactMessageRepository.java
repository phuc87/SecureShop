package com.secureshop.repository;

import com.secureshop.entity.ContactMessage;
import com.secureshop.entity.enums.ContactStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    @EntityGraph(attributePaths = {"handledBy"})
    List<ContactMessage> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"handledBy"})
    List<ContactMessage> findByStatusOrderByCreatedAtDesc(ContactStatus status);

    long countByStatus(ContactStatus status);

    /** Chống spam: đếm số tin cùng email gửi gần đây. */
    long countByEmailIgnoreCaseAndCreatedAtAfter(String email, LocalDateTime after);
}
