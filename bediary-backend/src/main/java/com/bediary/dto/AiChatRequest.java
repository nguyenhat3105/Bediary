package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(
        @NotBlank @Size(max = 1000) String question,
        @Size(max = 12000) String context
) {}