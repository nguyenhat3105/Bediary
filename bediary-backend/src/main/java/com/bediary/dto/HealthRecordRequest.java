package com.bediary.dto;

import com.bediary.entity.HealthRecord;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record HealthRecordRequest(
        @NotNull HealthRecord.Type recordType,
        @NotBlank String title,
        LocalDate eventDate,
        LocalDate nextFollowUpDate,
        String facility,
        String doctorName,
        String diagnosis,
        String medicationName,
        String medicationDosage,
        HealthRecord.MedicationStatus medicationStatus,
        HealthRecord.HereditarySide hereditarySide,
        HealthRecord.Severity severity,
        String notes
) {}
