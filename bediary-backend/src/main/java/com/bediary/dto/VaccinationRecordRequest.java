package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record VaccinationRecordRequest(
        String scheduleKey,
        @NotBlank String vaccineName,
        int doseNumber,
        @NotNull LocalDate scheduledDate,
        LocalDate originalScheduledDate,
        String category,
        String ageLabel,
        String source,
        String status,
        String notes
) {}
