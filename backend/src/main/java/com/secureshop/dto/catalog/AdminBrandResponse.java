package com.secureshop.dto.catalog;

import com.secureshop.entity.Brand;

public record AdminBrandResponse(Long id, String name, String slug, String logoUrl, String country, long productCount) {

    public static AdminBrandResponse from(Brand b, long productCount) {
        return new AdminBrandResponse(b.getId(), b.getName(), b.getSlug(), b.getLogoUrl(), b.getCountry(), productCount);
    }
}
