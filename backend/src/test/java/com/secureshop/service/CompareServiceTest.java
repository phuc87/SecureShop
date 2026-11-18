package com.secureshop.service;

import com.secureshop.dto.product.CompareResponse;
import com.secureshop.dto.product.CompareResponse.Row;
import com.secureshop.entity.Brand;
import com.secureshop.entity.Category;
import com.secureshop.entity.Product;
import com.secureshop.entity.ProductSpec;
import com.secureshop.entity.enums.Placement;
import com.secureshop.exception.ApiException;
import com.secureshop.repository.ProductRepository;
import com.secureshop.repository.ProductReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/** Kiểm thử cách chấm điểm & đề xuất khi so sánh 2 sản phẩm. */
class CompareServiceTest {

    CompareService service;
    Category outdoor, lock;
    static final double[] NO_REVIEW = {0, 0};

    @BeforeEach
    void setUp() {
        service = new CompareService(mock(ProductRepository.class), mock(ProductReviewRepository.class));
        outdoor = category(1L, "Camera ngoài trời");
        lock = category(2L, "Khóa cửa thông minh");
    }

    private static Category category(Long id, String name) {
        Category c = new Category();
        c.setId(id);
        c.setName(name);
        return c;
    }

    private static Product product(String name, Category cat, long price, int warranty, int sold, String... specs) {
        Product p = new Product();
        p.setName(name);
        p.setSlug(name.toLowerCase().replace(' ', '-'));
        p.setCategory(cat);
        p.setPrice(BigDecimal.valueOf(price));
        p.setWarrantyMonths(warranty);
        p.setSoldCount(sold);
        p.setStock(10);
        p.setPlacement(Placement.OUTDOOR);
        Brand b = new Brand();
        b.setName("Hãng");
        p.setBrand(b);
        for (int i = 0; i < specs.length; i += 3) {
            ProductSpec s = new ProductSpec();
            s.setSpecKey(specs[i]);
            s.setSpecLabel(specs[i + 1]);
            s.setSpecValue(specs[i + 2]);
            s.setProduct(p);
            p.getSpecs().add(s);
        }
        return p;
    }

    private static Row row(CompareResponse r, String label) {
        return r.rows().stream().filter(x -> x.label().equals(label)).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("Camera tốt hơn hẳn (nét hơn, nhìn đêm xa hơn, bảo hành lâu hơn) dù đắt hơn -> được đề xuất")
    void betterCameraWins() {
        Product cheap = product("Cam A", outdoor, 800_000, 12, 50,
                "resolution_mp", "Độ phân giải (MP)", "2", "night_distance_m", "Tầm nhìn đêm (m)", "20");
        Product good = product("Cam B", outdoor, 1_000_000, 24, 60,
                "resolution_mp", "Độ phân giải (MP)", "4", "night_distance_m", "Tầm nhìn đêm (m)", "30");
        CompareResponse r = service.compare(cheap, good, NO_REVIEW, NO_REVIEW);

        assertThat(r.winner()).isEqualTo(1);
        assertThat(r.verdict()).isEqualTo("Nên chọn Cam B");
        assertThat(r.scores().get(1)).isGreaterThan(r.scores().get(0));
        assertThat(r.scores().get(0) + r.scores().get(1)).isEqualTo(100);
        assertThat(row(r, "Giá bán").winner()).isEqualTo(0);
        assertThat(r.reasons().get(0)).contains("Rẻ hơn 200.000 ₫");
        assertThat(r.reasons().get(1)).contains("Hình ảnh nét hơn (4MP so với 2MP)", "Nhìn đêm xa hơn (30m so với 20m)");
        // Bên thắng đắt hơn -> có lời khuyên cho người ít ngân sách
        assertThat(r.advice()).anyMatch(a -> a.contains("đắt hơn 200.000 ₫") && a.contains("tiết kiệm"));
    }

    @Test
    @DisplayName("Mỗi bên hơn một chút -> kết luận ngang nhau, khuyên chọn theo nhu cầu")
    void closeResultIsTie() {
        Product a = product("Cam A", outdoor, 800_000, 24, 50, "resolution_mp", "Độ phân giải (MP)", "2");
        Product b = product("Cam B", outdoor, 1_000_000, 24, 60, "resolution_mp", "Độ phân giải (MP)", "4");
        CompareResponse r = service.compare(a, b, NO_REVIEW, NO_REVIEW);

        assertThat(r.winner()).isNull();
        assertThat(r.verdict()).contains("ngang nhau");
        assertThat(r.advice()).anyMatch(x -> x.startsWith("Chọn Cam A nếu bạn ưu tiên: rẻ hơn"));
        assertThat(r.advice()).anyMatch(x -> x.startsWith("Chọn Cam B nếu bạn ưu tiên: hình ảnh nét hơn"));
    }

    @Test
    @DisplayName("Chênh giá dưới 3% coi như bằng giá; đánh giá chỉ chấm khi cả 2 đều có lượt đánh giá")
    void smallPriceGapAndMissingReviews() {
        Product a = product("Cam A", outdoor, 1_000_000, 12, 10);
        Product b = product("Cam B", outdoor, 1_020_000, 12, 10);
        CompareResponse r = service.compare(a, b, new double[]{4.8, 20}, NO_REVIEW);

        assertThat(row(r, "Giá bán").winner()).isNull();
        Row rating = row(r, "Đánh giá");
        assertThat(rating.scored()).isFalse();
        assertThat(rating.values()).containsExactly("4.8★ (20 lượt)", "Chưa có đánh giá");
    }

    @Test
    @DisplayName("Đánh giá cao hơn rõ rệt -> thắng tiêu chí đánh giá")
    void ratingCounts() {
        Product a = product("Cam A", outdoor, 1_000_000, 12, 10);
        Product b = product("Cam B", outdoor, 1_000_000, 12, 10);
        CompareResponse r = service.compare(a, b, new double[]{4.9, 30}, new double[]{3.5, 12});

        assertThat(row(r, "Đánh giá").winner()).isEqualTo(0);
        assertThat(r.winner()).isEqualTo(0);
        assertThat(r.reasons().get(0)).anyMatch(x -> x.contains("4.9★ so với 3.5★"));
    }

    @Test
    @DisplayName("Tính năng chỉ 1 bên có (xoay quét, AI) -> bên có được điểm")
    void presenceMatters() {
        Product a = product("Cam A", outdoor, 1_000_000, 12, 10, "pan_tilt", "Xoay quét", "Ngang 355°, dọc 90°");
        Product b = product("Cam B", outdoor, 1_000_000, 12, 10);
        CompareResponse r = service.compare(a, b, NO_REVIEW, NO_REVIEW);

        Row pan = row(r, "Xoay quét");
        assertThat(pan.scored()).isTrue();
        assertThat(pan.winner()).isEqualTo(0);
        assertThat(pan.values()).containsExactly("Ngang 355°, dọc 90°", "—");
        assertThat(r.reasons().get(0)).anyMatch(x -> x.contains("bên kia không có"));
    }

    @Test
    @DisplayName("Đọc được thông số: IP66 > IP65, 2TB > 128GB, đếm số cách mở khoá")
    void parsers() {
        assertThat(CompareService.ipNumber("IP65 (nút gọi ngoài trời)")).isEqualTo(65);
        assertThat(CompareService.sizeInGb("2TB")).isEqualTo(2000);
        assertThat(CompareService.sizeInGb("Thẻ nhớ tối đa 256GB, Cloud")).isEqualTo(256);
        assertThat(CompareService.sizeInGb("1 ổ, tối đa 10TB")).isEqualTo(10000);
        assertThat(CompareService.countItems("Vân tay, mã số, thẻ, chìa cơ")).isEqualTo(4);
        assertThat(CompareService.sumNumbers("Ngang 360°, dọc 114°")).isEqualTo(474);
        assertThat(CompareService.firstNumber("không có số")).isNaN();
        assertThat(CompareService.money(BigDecimal.valueOf(1_590_000))).isEqualTo("1.590.000 ₫");
    }

    @Test
    @DisplayName("Thiết bị cần mua thêm đầu ghi -> cảnh báo chi phí phát sinh")
    void hiddenCostWarning() {
        Product analog = product("Cam Analog", outdoor, 450_000, 24, 100, "connectivity", "Kết nối", "Analog 4in1 (cần đầu ghi DVR)");
        Product wifi = product("Cam WiFi", outdoor, 1_050_000, 24, 40, "connectivity", "Kết nối", "WiFi, LAN");
        CompareResponse r = service.compare(analog, wifi, NO_REVIEW, NO_REVIEW);

        assertThat(r.advice()).anyMatch(x -> x.equals(
                "Lưu ý: Cam Analog cần đầu ghi DVR mới sử dụng được, nên tính thêm chi phí thiết bị này."));
    }

    @Test
    @DisplayName("Khác loại sản phẩm -> không chấm thông số, có cảnh báo chỉ mang tính tham khảo")
    void differentCategories() {
        Product cam = product("Cam A", outdoor, 1_000_000, 12, 10, "resolution_mp", "Độ phân giải (MP)", "4");
        Product door = product("Khoá B", lock, 3_000_000, 24, 10, "unlock_methods", "Cách mở khóa", "Vân tay, mã số");
        CompareResponse r = service.compare(cam, door, NO_REVIEW, NO_REVIEW);

        assertThat(r.sameCategory()).isFalse();
        assertThat(r.rows().stream().filter(x -> x.group().equals("Thông số kỹ thuật")).noneMatch(Row::scored)).isTrue();
        assertThat(r.advice().get(0)).contains("2 loại khác nhau").contains("tham khảo");
    }

    @Test
    @DisplayName("Bên được đề xuất đang hết hàng -> gợi ý bên còn hàng")
    void winnerOutOfStock() {
        Product a = product("Cam A", outdoor, 1_000_000, 24, 90, "resolution_mp", "Độ phân giải (MP)", "4");
        Product b = product("Cam B", outdoor, 1_000_000, 12, 10, "resolution_mp", "Độ phân giải (MP)", "2");
        a.setStock(0);
        CompareResponse r = service.compare(a, b, NO_REVIEW, NO_REVIEW);

        assertThat(r.winner()).isEqualTo(0);
        assertThat(r.advice()).anyMatch(x -> x.contains("Cam A đang hết hàng") && x.contains("Cam B"));
    }

    @Test
    @DisplayName("Phải chọn đúng 2 sản phẩm khác nhau")
    void needsTwoDifferent() {
        assertThatThrownBy(() -> service.compare(List.of("a"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.compare(List.of("a", "a"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.compare(null)).isInstanceOf(ApiException.class);
    }
}
