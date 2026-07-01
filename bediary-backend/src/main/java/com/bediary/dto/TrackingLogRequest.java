package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.Map;

/**
 * activityType: "SLEEP" | "FEED" | "DIAPER" (String — ActivityType enum removed)
 */
public record TrackingLogRequest(
        @NotBlank String activityType,
        @NotNull Instant startTime,
        Instant endTime,
        Map<String, Object> metadata
) {}
