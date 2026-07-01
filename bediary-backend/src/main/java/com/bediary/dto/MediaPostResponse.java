package com.bediary.dto;

import java.time.Instant;
import java.util.UUID;

public record MediaPostResponse(
        UUID id,
        String mediaUrl,
        String mediaType,
        String caption,
        String uploadedByName,
        Instant createdAt
) {}
