package com.bediary.dto;

public record AiChatResponse(
        String answer,
        String safetyNote
) {}
