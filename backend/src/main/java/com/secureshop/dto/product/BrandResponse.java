package com.secureshop.dto.product;

import com.secureshop.entity.Brand;

public record BrandResponse(Long id, String name, String slug, String logoUrl, String country) {

    public static BrandResponse from(Brand b) {
        return new BrandResponse(b.getId(), b.getName(), b.getSlug(), b.getLogoUrl(), b.getCountry());
    }
}
