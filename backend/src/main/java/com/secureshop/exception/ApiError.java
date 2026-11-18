package com.secureshop.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

/** Định dạng lỗi thống nhất cho mọi API, frontend chỉ cần đọc field "message". */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(int status, String message, Map<String, String> errors, LocalDateTime timestamp) {

    public static ApiError of(int status, String message) {
        return new ApiError(status, message, null, LocalDateTime.now());
    }

    public static ApiError of(int status, String message, Map<String, String> errors) {
        return new ApiError(status, message, errors, LocalDateTime.now());
    }
}
