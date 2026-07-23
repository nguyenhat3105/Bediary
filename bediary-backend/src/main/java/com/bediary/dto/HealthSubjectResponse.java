package com.bediary.dto;

import java.time.Instant;
import java.util.UUID;

public record HealthSubjectResponse(
        UUID id,
        String relationship,
        String displayName,
        Instant createdAt
) {}
