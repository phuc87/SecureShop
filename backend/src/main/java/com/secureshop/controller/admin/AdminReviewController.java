package com.secureshop.controller.admin;

import com.secureshop.dto.PageResponse;
import com.secureshop.dto.review.AdminReviewResponse;
import com.secureshop.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reviews")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewService reviewService;

    /** GET /api/admin/reviews?filter=unseen|low|all&rating=1..5&page=0 */
    @GetMapping
    public PageResponse<AdminReviewResponse> list(@RequestParam(defaultValue = "all") String filter,
                                                  @RequestParam(required = false) Integer rating,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size) {
        return reviewService.adminList(filter, rating, page, size);
    }

    /** Số đánh giá mới admin chưa xem (số đỏ trên menu). */
    @GetMapping("/unseen-count")
    public java.util.Map<String, Long> unseenCount() {
        return java.util.Map.of("count", reviewService.unseenCount());
    }

    @PatchMapping("/{id}/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSeen(@PathVariable Long id) {
        reviewService.markSeen(id);
    }

    @PostMapping("/seen-all")
    public java.util.Map<String, Integer> markAllSeen() {
        return java.util.Map.of("updated", reviewService.markAllSeen());
    }

    /** Xoá đánh giá (nút thùng rác hiện cho admin ở trang chi tiết sản phẩm). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        reviewService.delete(id);
    }
}
