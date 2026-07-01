package com.bediary.dto;

import java.time.Instant;
import java.util.UUID;

public record PostCommentResponse(
        UUID id,
        String content,
        String userName,
        String userAvatar,
        Instant createdAt
) {}
