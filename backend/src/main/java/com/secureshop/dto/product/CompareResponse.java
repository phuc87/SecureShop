package com.secureshop.dto.product;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kết quả so sánh 2 sản phẩm.
 * winner: 0 = sản phẩm thứ nhất, 1 = sản phẩm thứ hai, null = ngang nhau / không chấm điểm.
 */
public record CompareResponse(List<Item> products,
                              boolean sameCategory,
                              List<Row> rows,
                              List<Integer> scores,
                              Integer winner,
                              String verdict,
                              List<List<String>> reasons,
                              List<String> advice) {

    public record Item(Long id, String name, String slug, String thumbnailUrl,
                       BigDecimal price, BigDecimal salePrice, BigDecimal effectivePrice,
                       int stock, int warrantyMonths, String brandName, String categoryName,
                       Double ratingAvg, long ratingCount, int soldCount) {
    }

    /** Một dòng của bảng so sánh. scored = dòng có được tính điểm không (dòng chỉ để xem thì false). */
    public record Row(String group, String label, List<String> values, Integer winner, boolean scored, double weight) {
    }
}
