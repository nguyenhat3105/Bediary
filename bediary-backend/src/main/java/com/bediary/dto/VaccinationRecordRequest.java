package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record VaccinationRecordRequest(
        @NotBlank String vaccineName,
        int doseNumber,
        @NotNull LocalDate scheduledDate,
        String notes
) {}
