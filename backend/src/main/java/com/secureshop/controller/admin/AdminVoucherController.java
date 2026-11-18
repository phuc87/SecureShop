package com.secureshop.controller.admin;

import com.secureshop.dto.voucher.VoucherDtos.AdminVoucherResponse;
import com.secureshop.dto.voucher.VoucherDtos.VoucherRequest;
import com.secureshop.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Admin quản lý mã giảm giá: /api/admin/vouchers */
@RestController
@RequestMapping("/api/admin/vouchers")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminVoucherController {

    private final VoucherService voucherService;

    public record ActiveRequest(boolean active) {
    }

    @GetMapping
    public List<AdminVoucherResponse> list() {
        return voucherService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminVoucherResponse create(@Valid @RequestBody VoucherRequest request) {
        return voucherService.create(request);
    }

    @PutMapping("/{id}")
    public AdminVoucherResponse update(@PathVariable Long id, @Valid @RequestBody VoucherRequest request) {
        return voucherService.update(id, request);
    }

    /** Bật / tắt nhanh. body: { "active": false } */
    @PatchMapping("/{id}/active")
    public AdminVoucherResponse setActive(@PathVariable Long id, @RequestBody ActiveRequest request) {
        return voucherService.setActive(id, request.active());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        voucherService.delete(id);
    }
}
