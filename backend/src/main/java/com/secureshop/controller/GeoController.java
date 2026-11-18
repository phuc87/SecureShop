package com.secureshop.controller;

import com.secureshop.service.GeoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Bản đồ chọn địa chỉ giao hàng (cần đăng nhập). Trả nguyên JSON của OpenStreetMap Nominatim. */
@RestController
@RequestMapping(value = "/api/geo", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class GeoController {

    private final GeoService geoService;

    /** GET /api/geo/reverse?lat=10.73&lon=106.72 : toạ độ -> địa chỉ */
    @GetMapping("/reverse")
    public String reverse(@RequestParam double lat, @RequestParam double lon) {
        return geoService.reverse(lat, lon);
    }

    /** GET /api/geo/search?q=Nguyễn Văn Linh, Quận 7 : địa chỉ -> toạ độ */
    @GetMapping("/search")
    public String search(@RequestParam String q) {
        return geoService.search(q);
    }
}
