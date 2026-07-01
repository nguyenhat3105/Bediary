package com.bediary.dto;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

public record RoutineResponse(
        UUID id,
        String label,
        String activityType,
        LocalTime scheduledTime,
        boolean isActive,
        Instant createdAt
) {}
