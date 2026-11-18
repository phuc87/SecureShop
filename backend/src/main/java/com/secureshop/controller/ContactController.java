package com.secureshop.controller;

import com.secureshop.dto.contact.ContactRequest;
import com.secureshop.dto.contact.ContactResponse;
import com.secureshop.security.UserPrincipal;
import com.secureshop.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Form Liên hệ: ai cũng gửi được, kể cả chưa đăng nhập. */
@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactResponse submit(@Valid @RequestBody ContactRequest request,
                                  @AuthenticationPrincipal UserPrincipal me) {
        return contactService.submit(request, me != null ? me.id() : null);
    }
}
