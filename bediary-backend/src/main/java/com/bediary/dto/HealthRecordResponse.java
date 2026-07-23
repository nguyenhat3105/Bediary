package com.bediary.dto;

import com.bediary.entity.HealthRecord;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record HealthRecordResponse(
        UUID id,
        HealthRecord.Type recordType,
        String title,
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
        String notes,
        String createdByName,
        Instant createdAt,
        /** null = hồ sơ của Bé */
        UUID subjectId,
        String subjectRelationship,
        String subjectDisplayName
) {}
