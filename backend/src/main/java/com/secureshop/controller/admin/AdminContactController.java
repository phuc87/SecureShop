package com.secureshop.controller.admin;

import com.secureshop.dto.contact.ContactResponse;
import com.secureshop.entity.enums.ContactStatus;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ContactService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/contacts")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminContactController {

    private final ContactService contactService;

    /** GET /api/admin/contacts?status=NEW */
    @GetMapping
    public List<ContactResponse> list(@RequestParam(required = false) ContactStatus status) {
        return contactService.list(status);
    }

    /** Số tin chưa xử lý, hiện badge trên menu admin. */
    @GetMapping("/count-new")
    public Map<String, Long> countNew() {
        return Map.of("count", contactService.countNew());
    }

    public record StatusRequest(@NotNull ContactStatus status) {
    }

    /** PATCH /api/admin/contacts/5/status  body: {"status":"HANDLED"} */
    @PatchMapping("/{id}/status")
    public ContactResponse updateStatus(@PathVariable Long id, @RequestBody @jakarta.validation.Valid StatusRequest body,
                                        @AuthenticationPrincipal UserPrincipal me) {
        return contactService.updateStatus(id, body.status(), me.id());
    }
}
