package com.bediary.dto;

import java.util.List;

public record NutritionSuggestionResponse(
        String basis,
        List<NutritionItem> items
) {
    public record NutritionItem(
            String name,
            String iconKey,
            String category,
            String reason,
            String servingNote,
            String priority
    ) {}
}
