package com.bediary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record VaccinationRecordResponse(
        UUID id,
        String vaccineName,
        int doseNumber,
        LocalDate scheduledDate,
        Instant completedAt,
        String notes,
        /** True when scheduledDate < today and completedAt is null */
        boolean isOverdue,
        Instant createdAt
) {}
