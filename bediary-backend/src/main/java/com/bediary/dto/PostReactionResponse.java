package com.bediary.dto;

import java.util.UUID;

public record PostReactionResponse(
        UUID postId,
        boolean reacted,
        long reactionCount
) {}
