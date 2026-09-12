package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DoctorChatMessageRequest(
        @NotBlank(message = "content is required")
        @Size(max = 6000, message = "content must be at most 6000 characters")
        String content
) {}
