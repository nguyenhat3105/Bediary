package com.bediary.dto;

import java.time.Instant;
import java.util.UUID;

public record DoctorChatMessageResponse(
        UUID id,
        UUID senderId,
        String senderName,
        String senderRole,
        String content,
        Instant createdAt
) {}
