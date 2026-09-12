package com.bediary.dto;

public record AiChatResponse(
        String answer,
        String safetyNote,
        String route,
        String routeLabel,
        String routeDebug
) {
    public AiChatResponse(String answer, String safetyNote) {
        this(answer, safetyNote, null, null, null);
    }
}
