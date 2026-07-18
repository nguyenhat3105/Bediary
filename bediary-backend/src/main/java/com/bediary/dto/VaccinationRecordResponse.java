package com.bediary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record VaccinationRecordResponse(
        UUID id,
        String scheduleKey,
        String vaccineName,
        int doseNumber,
        LocalDate scheduledDate,
        String category,
        String ageLabel,
        Instant completedAt,
        String notes,
        boolean isOverdue,
        Instant createdAt
) {}