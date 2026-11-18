package com.secureshop.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.secureshop.dto.product.ProductSummaryResponse;

import java.util.List;

/**
 * Câu trả lời của trợ lý AI cho 1 tin nhắn.
 * action: null | HANDOFF (đã chuyển cho tư vấn viên) | LOGIN_REQUIRED | OFFLINE (AI service đang tắt)
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record AiReply(Long logId, String text, List<ProductSummaryResponse> products, List<String> quickReplies,
                      List<Link> links, String intent, Double confidence, String action) {

    public record Link(String label, String url) {
    }
}
