package com.bediary.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record RoutineLogRequest(
        /** ID of the routine being executed — nullable for ad-hoc logs */
        UUID routineId,
        @NotNull Instant executedAt,
        String note
) {}
