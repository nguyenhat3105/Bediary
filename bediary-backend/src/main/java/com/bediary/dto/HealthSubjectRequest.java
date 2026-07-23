package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HealthSubjectRequest(
        @NotBlank @Size(max = 30) String relationship,
        @Size(max = 80) String displayName
) {}
