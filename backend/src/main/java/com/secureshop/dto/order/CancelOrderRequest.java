package com.secureshop.dto.order;

import jakarta.validation.constraints.Size;

public record CancelOrderRequest(@Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
}
