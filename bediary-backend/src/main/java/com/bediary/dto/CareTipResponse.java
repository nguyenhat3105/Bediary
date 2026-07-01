package com.bediary.dto;

import java.util.UUID;

public record CareTipResponse(
        UUID id,
        String category,
        String title,
        String content,
        String sourceType,
        boolean isPremium
) {}
