package com.bediary.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record GrowthRecordResponse(
        UUID id,
        int ageDays,
        BigDecimal weightKg,
        BigDecimal heightCm,
        String weightStatus,
        String heightStatus,
        Double weightZScore,
        Double heightZScore,
        Double weightPercentile,
        Double heightPercentile,
        String growthSource,
        /** Friendly Vietnamese status text with emoji */
        String statusText,
        /** Optional advice based on WHO status */
        String suggestion,
        Instant recordedAt
) {}
