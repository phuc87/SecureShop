package com.secureshop.dto.chat;

import java.util.List;

/** messages sắp xếp cũ -> mới; hasMore = còn tin cũ hơn để tải. */
public record MessagePage(List<MessageResponse> messages, boolean hasMore) {
}
