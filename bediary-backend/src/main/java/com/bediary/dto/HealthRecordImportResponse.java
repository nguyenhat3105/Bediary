package com.bediary.dto;

import java.util.List;

public record HealthRecordImportResponse(
        List<HealthRecordRequest> records,
        String extractedText,
        List<String> warnings
) {}
