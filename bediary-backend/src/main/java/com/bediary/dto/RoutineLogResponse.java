package com.bediary.dto;

import java.time.Instant;
import java.util.UUID;

public record RoutineLogResponse(
        UUID id,
        UUID routineId,
        String routineLabel,
        Instant executedAt,
        Integer deviationMinutes,
        boolean scheduleUpdated,
        String note,
        /** True if |deviationMinutes| > 60 — client should ask user to reschedule */
        boolean correctionPrompt
) {}
