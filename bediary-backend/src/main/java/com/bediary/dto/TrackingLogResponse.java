package com.bediary.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * activityType: "SLEEP" | "FEED" | "DIAPER"
 */
public record TrackingLogResponse(
        UUID id,
        String activityType,
        Instant startTime,
        Instant endTime,
        Map<String, Object> metadata,
        String createdByName
) {}
