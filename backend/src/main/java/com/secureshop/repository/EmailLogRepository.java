package com.secureshop.repository;

import com.secureshop.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    List<EmailLog> findByRelatedOrderIdOrderByCreatedAtAscIdAsc(Long orderId);
}
