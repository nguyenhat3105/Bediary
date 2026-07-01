package com.bediary.dto;

import java.math.BigDecimal;

public record GrowthRecordRequest(
        /** Weight in kg — nullable if only height is being recorded */
        BigDecimal weightKg,
        /** Height in cm — nullable if only weight is being recorded */
        BigDecimal heightCm
) {}
