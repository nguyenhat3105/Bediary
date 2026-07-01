package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

public record RoutineRequest(
        @NotBlank String label,
        @NotBlank String activityType,
        @NotNull LocalTime scheduledTime
) {}
