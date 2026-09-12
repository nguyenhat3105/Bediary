package com.bediary.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AiChatRequest(
        @NotBlank @Size(max = 1000) String question,
        @Size(max = 12000) String context,
        @Valid @Size(max = 10) List<ChatMessage> history
) {
    public record ChatMessage(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 1500) String text
    ) {}
}
