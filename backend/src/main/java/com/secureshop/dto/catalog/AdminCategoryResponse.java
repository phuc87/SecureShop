package com.secureshop.dto.catalog;

import com.secureshop.entity.Category;

public record AdminCategoryResponse(Long id, String name, String slug, String description, String imageUrl,
                                    int sortOrder, long productCount) {

    public static AdminCategoryResponse from(Category c, long productCount) {
        return new AdminCategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getImageUrl(),
                c.getSortOrder(), productCount);
    }
}
