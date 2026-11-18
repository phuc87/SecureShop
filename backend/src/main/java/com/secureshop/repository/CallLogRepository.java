package com.secureshop.repository;

import com.secureshop.entity.CallLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface CallLogRepository extends JpaRepository<CallLog, Long> {

    /** Server vừa khởi động: cuộc gọi nào còn "đang đổ chuông / đang nói" là của lần chạy trước -> đánh dấu FAILED. */
    @Modifying
    @Query("""
            UPDATE CallLog c SET c.status = com.secureshop.entity.enums.CallStatus.FAILED, c.endedAt = :now
            WHERE c.status IN (com.secureshop.entity.enums.CallStatus.RINGING, com.secureshop.entity.enums.CallStatus.ACCEPTED)
            """)
    int failUnfinished(@Param("now") LocalDateTime now);
}
