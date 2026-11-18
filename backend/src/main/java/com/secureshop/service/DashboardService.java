package com.secureshop.service;

import com.secureshop.dto.order.OrderSummaryResponse;
import com.secureshop.entity.enums.ContactStatus;
import com.secureshop.entity.enums.OrderStatus;
import com.secureshop.entity.enums.ProductStatus;
import com.secureshop.entity.enums.Role;
import com.secureshop.mail.EmailService;
import com.secureshop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.*;

/** Số liệu trang Tổng quan của admin. */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int DAYS = 14;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ContactMessageRepository contactRepository;
    private final OrderService orderService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public Map<String, Object> stats() {
        LocalDate today = LocalDate.now();
        Map<String, Object> res = new LinkedHashMap<>();

        res.put("revenueCompleted", orderRepository.sumTotalByStatus(OrderStatus.COMPLETED));
        res.put("revenueThisMonth", orderRepository.sumTotalByStatusSince(OrderStatus.COMPLETED,
                today.withDayOfMonth(1).atStartOfDay()));
        res.put("ordersToday", orderRepository.countByCreatedAtGreaterThanEqual(today.atStartOfDay()));
        res.put("ordersByStatus", orderService.countsByStatus());
        res.put("customers", userRepository.search(null, Role.CUSTOMER, org.springframework.data.domain.Sort.unsorted()).size());
        res.put("productsActive", productRepository.countByStatus(ProductStatus.ACTIVE));
        res.put("productsHidden", productRepository.countByStatus(ProductStatus.HIDDEN));
        res.put("unreadChats", conversationRepository.totalUnreadForAdmin());
        res.put("newContacts", contactRepository.countByStatus(ContactStatus.NEW));

        res.put("lowStock", productRepository.findTop8ByStatusAndStockLessThanEqualOrderByStockAscIdAsc(ProductStatus.ACTIVE, 5)
                .stream().map(p -> Map.of("id", p.getId(), "name", p.getName(), "sku", p.getSku(), "stock", p.getStock(),
                        "categoryName", p.getCategory().getName())).toList());

        res.put("recentOrders", orderRepository.findTop6ByOrderByCreatedAtDescIdDesc().stream()
                .map(OrderSummaryResponse::from).toList());

        // Giá trị đơn 14 ngày gần nhất (đủ 14 ngày, ngày không có đơn = 0)
        Map<LocalDate, Object[]> byDay = new HashMap<>();
        for (Object[] row : orderRepository.dailyTotalsSince(today.minusDays(DAYS - 1).atStartOfDay())) {
            byDay.put(((Date) row[0]).toLocalDate(), row);
        }
        List<Map<String, Object>> daily = new ArrayList<>();
        for (int i = DAYS - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            Object[] row = byDay.get(d);
            daily.add(Map.of("date", d.toString(),
                    "orders", row == null ? 0L : ((Number) row[1]).longValue(),
                    "total", row == null ? BigDecimal.ZERO : new BigDecimal(row[2].toString())));
        }
        res.put("daily", daily);

        res.put("mail", Map.of("configured", emailService.isConfigured(), "sender", emailService.senderAddress(),
                "notifyTo", emailService.notifyAddress()));
        return res;
    }
}
