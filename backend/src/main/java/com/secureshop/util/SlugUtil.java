package com.secureshop.util;

import java.text.Normalizer;
import java.util.Locale;

/** "Camera WiFi Ezviz C6N 2MP xoay 360°" -> "camera-wifi-ezviz-c6n-2mp-xoay-360" (bỏ dấu tiếng Việt). */
public final class SlugUtil {

    private SlugUtil() {
    }

    public static String slugify(String text) {
        if (text == null) return "";
        String s = text.trim().replace('đ', 'd').replace('Đ', 'D');
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", ""); // bỏ dấu
        s = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        return s.length() > 250 ? s.substring(0, 250).replaceAll("-+$", "") : s;
    }
}
