package com.secureshop.service;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.order.*;
import com.secureshop.entity.*;
import com.secureshop.entity.enums.*;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.*;
import com.secureshop.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ đơn hàng.
 * Quy tắc chính:
 *  - Giá, phí giao hàng, tổng tiền luôn do server tính từ database.
 *  - Đặt hàng khoá các dòng sản phẩm (SELECT ... FOR UPDATE) rồi mới kiểm tra & trừ tồn kho.
 *  - Huỷ đơn thì cộng lại tồn kho.
 *  - Mỗi lần đổi trạng thái đều ghi lịch sử và phát sự kiện để gửi email (sau khi commit).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final EmailLogRepository emailLogRepository;
    private final ApplicationEventPublisher events;

    @Value("${app.order.free-shipping-from}")
    private BigDecimal freeShippingFrom;

    @Value("${app.order.shipping-fee}")
    private BigDecimal shippingFee;

    // ============================ KHÁCH HÀNG ============================

    @Transactional
    public OrderDetailResponse placeOrder(UserPrincipal me, CheckoutRequest req) {
        if (req.paymentMethod() == PaymentMethod.VNPAY) {
            throw ApiException.badRequest("Hiện chưa hỗ trợ VNPay, vui lòng chọn COD hoặc chuyển khoản");
        }
        // Gộp các dòng trùng sản phẩm
        Map<Long, Integer> wanted = new LinkedHashMap<>();
        req.items().forEach(i -> wanted.merge(i.productId(), i.quantity(), Integer::sum));

        // Khoá theo thứ tự id tăng dần để 2 đơn đồng thời không khoá chéo nhau
        Map<Long, Product> products = productRepository
                .findAllByIdForUpdate(wanted.keySet().stream().sorted().toList()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<String> problems = new ArrayList<>();
        wanted.forEach((id, qty) -> {
            Product p = products.get(id);
            if (p == null || p.getStatus() != ProductStatus.ACTIVE) {
                problems.add("một sản phẩm trong giỏ không còn bán");
            } else if (qty > 99) {
                problems.add(p.getName() + ": tối đa 99 cái mỗi đơn");
            } else if (p.getStock() < qty) {
                problems.add(p.getName() + (p.getStock() == 0 ? ": đã hết hàng" : ": chỉ còn " + p.getStock() + " sản phẩm"));
            }
        });
        if (!problems.isEmpty()) {
            throw ApiException.conflict("Không đặt được hàng: " + String.join("; ", problems) + ". Vui lòng cập nhật giỏ hàng.");
        }

        User user = userRepository.getReferenceById(me.id());
        Order order = new Order();
        order.setUser(user);
        order.setReceiverName(req.receiverName().trim());
        order.setReceiverPhone(req.receiverPhone().trim());
        order.setReceiverEmail(req.receiverEmail().trim().toLowerCase(Locale.ROOT));
        order.setShippingAddress(String.join(", ", req.street().trim(), req.ward().trim(),
                req.district().trim(), req.province().trim()));
        order.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        order.setPaymentMethod(req.paymentMethod());

        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> e : wanted.entrySet()) {
            Product p = products.get(e.getKey());
            int qty = e.getValue();
            BigDecimal price = p.getEffectivePrice();
            OrderItem item = new OrderItem();
            item.setProduct(p);
            item.setProductName(p.getName());
            item.setProductSku(p.getSku());
            item.setProductThumbnail(p.getThumbnailUrl());
            item.setUnitPrice(price);
            item.setQuantity(qty);
            item.setLineTotal(price.multiply(BigDecimal.valueOf(qty)));
            order.addItem(item);
            subtotal = subtotal.add(item.getLineTotal());

            p.setStock(p.getStock() - qty);
            p.setSoldCount(p.getSoldCount() + qty);
        }
        BigDecimal fee = subtotal.compareTo(freeShippingFrom) >= 0 ? BigDecimal.ZERO : shippingFee;
        order.setSubtotal(subtotal);
        order.setShippingFee(fee);
        order.setDiscount(BigDecimal.ZERO);
        order.setTotal(subtotal.add(fee));
        order.addHistory(OrderStatusHistory.of(null, OrderStatus.PENDING, user, "Khách đặt hàng"));

        // Mã đơn dựa trên id -> không bao giờ trùng: lưu với mã tạm, có id rồi mới đặt mã thật
        order.setOrderCode("TMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        orderRepository.saveAndFlush(order);
        order.setOrderCode(String.format("SS%s-%05d", LocalDate.now().format(CODE_DATE), order.getId()));

        if (req.saveAddress()) saveDefaultAddress(user, req);

        log.info("Đơn mới {} của user #{}: {} sản phẩm, tổng {}", order.getOrderCode(), me.id(), wanted.size(), order.getTotal());
        events.publishEvent(new OrderEvents.Placed(order.getId()));
        return OrderDetailResponse.from(order, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> myOrders(UserPrincipal me, int page, int size) {
        return PageResponse.from(orderRepository.findByUserIdOrderByCreatedAtDescIdDesc(me.id(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50))), OrderSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse myOrder(UserPrincipal me, Long id) {
        return OrderDetailResponse.from(loadOwn(me, id), null);
    }

    @Transactional
    public OrderDetailResponse cancelByCustomer(UserPrincipal me, Long id, String reason) {
        Order order = loadOwn(me, id);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw ApiException.badRequest("Chỉ huỷ được đơn đang chờ xác nhận. Đơn này đã được xử lý, "
                    + "vui lòng liên hệ hotline để được hỗ trợ.");
        }
        String note = reason == null || reason.isBlank() ? "Khách tự huỷ đơn" : "Khách huỷ: " + reason.trim();
        changeStatus(order, OrderStatus.CANCELLED, userRepository.getReferenceById(me.id()), note);
        return OrderDetailResponse.from(order, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> defaultAddress(UserPrincipal me) {
        Map<String, Object> res = new HashMap<>();
        addressRepository.findFirstByUserIdAndDefaultAddressTrueOrderByIdDesc(me.id())
                .or(() -> addressRepository.findFirstByUserIdOrderByIdDesc(me.id()))
                .ifPresent(a -> res.put("address", Map.of(
                        "receiverName", a.getReceiverName(), "receiverPhone", a.getReceiverPhone(),
                        "province", a.getProvince(), "district", a.getDistrict(),
                        "ward", a.getWard(), "street", a.getStreet())));
        return res;
    }

    // ============================== ADMIN ===============================

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> search(OrderStatus status, String keyword, int page, int size) {
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return PageResponse.from(orderRepository.search(status, kw,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50))), OrderSummaryResponse::from);
    }

    /** Số đơn theo từng trạng thái + tổng, để hiện trên các tab. */
    @Transactional(readOnly = true)
    public Map<String, Long> countsByStatus() {
        Map<String, Long> res = new LinkedHashMap<>();
        Arrays.stream(OrderStatus.values()).forEach(s -> res.put(s.name(), 0L));
        long all = 0;
        for (Object[] row : orderRepository.countGroupByStatus()) {
            long n = (Long) row[1];
            res.put(((OrderStatus) row[0]).name(), n);
            all += n;
        }
        res.put("ALL", all);
        return res;
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse adminDetail(Long id) {
        Order order = orderRepository.findWithUserById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        return OrderDetailResponse.from(order, emailLogRepository.findByRelatedOrderIdOrderByCreatedAtAscIdAsc(id));
    }

    @Transactional
    public OrderDetailResponse adminUpdateStatus(UserPrincipal admin, Long id, UpdateOrderStatusRequest req) {
        Order order = orderRepository.findWithUserById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        OrderStatus target = req.status();
        if (!order.getStatus().canChangeTo(target)) {
            throw ApiException.badRequest("Không thể chuyển đơn từ \"" + order.getStatus().label()
                    + "\" sang \"" + target.label() + "\"");
        }
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        if (target == OrderStatus.CANCELLED && note == null) {
            throw ApiException.badRequest("Vui lòng nhập lý do huỷ đơn (khách sẽ nhận được trong email)");
        }
        changeStatus(order, target, userRepository.getReferenceById(admin.id()), note);
        return adminDetail(id);
    }

    /** Xác nhận đã nhận tiền (đơn chuyển khoản). Ghi vào lịch sử, không đổi trạng thái đơn. */
    @Transactional
    public OrderDetailResponse markPaid(UserPrincipal admin, Long id) {
        Order order = orderRepository.findWithUserById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        if (order.getStatus() == OrderStatus.CANCELLED) throw ApiException.badRequest("Đơn đã huỷ");
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.PAID);
            order.addHistory(OrderStatusHistory.of(order.getStatus(), order.getStatus(),
                    userRepository.getReferenceById(admin.id()), "Xác nhận đã nhận thanh toán"));
        }
        return adminDetail(id);
    }

    // ============================= NỘI BỘ ==============================

    private Order loadOwn(UserPrincipal me, Long id) {
        Order order = orderRepository.findWithUserById(id).orElse(null);
        // Đơn của người khác: trả 404 như không tồn tại, để không lộ thông tin
        if (order == null || order.getUser() == null || !order.getUser().getId().equals(me.id())) {
            throw ApiException.notFound("Không tìm thấy đơn hàng");
        }
        return order;
    }

    private void changeStatus(Order order, OrderStatus target, User actor, String note) {
        OrderStatus from = order.getStatus();
        if (target == OrderStatus.CANCELLED) {
            restock(order);
            order.setCancelReason(note);
        }
        if (target == OrderStatus.COMPLETED && order.getPaymentMethod() == PaymentMethod.COD) {
            order.setPaymentStatus(PaymentStatus.PAID); // giao xong COD = đã thu tiền
        }
        order.setStatus(target);
        order.addHistory(OrderStatusHistory.of(from, target, actor, note));
        log.info("Đơn {}: {} -> {}", order.getOrderCode(), from, target);
        events.publishEvent(new OrderEvents.StatusChanged(order.getId(), from, target, note));
    }

    /** Huỷ đơn: trả số lượng về kho (khoá dòng sản phẩm như lúc đặt). */
    private void restock(Order order) {
        Map<Long, Integer> qty = new HashMap<>();
        order.getItems().stream().filter(i -> i.getProduct() != null)
                .forEach(i -> qty.merge(i.getProduct().getId(), i.getQuantity(), Integer::sum));
        if (qty.isEmpty()) return;
        for (Product p : productRepository.findAllByIdForUpdate(qty.keySet().stream().sorted().toList())) {
            int n = qty.get(p.getId());
            p.setStock(p.getStock() + n);
            p.setSoldCount(Math.max(0, p.getSoldCount() - n));
        }
    }

    private void saveDefaultAddress(User user, CheckoutRequest req) {
        Address a = addressRepository.findFirstByUserIdAndDefaultAddressTrueOrderByIdDesc(user.getId()).orElseGet(() -> {
            Address n = new Address();
            n.setUser(user);
            n.setDefaultAddress(true);
            return n;
        });
        a.setReceiverName(req.receiverName().trim());
        a.setReceiverPhone(req.receiverPhone().trim());
        a.setProvince(req.province().trim());
        a.setDistrict(req.district().trim());
        a.setWard(req.ward().trim());
        a.setStreet(req.street().trim());
        addressRepository.save(a);
    }
}
