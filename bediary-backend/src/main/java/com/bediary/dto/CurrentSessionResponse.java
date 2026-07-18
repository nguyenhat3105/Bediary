package com.bediary.dto;

import java.util.UUID;

public record CurrentSessionResponse(
        UUID userId,
        String email,
        String fullName,
        UUID familyId,
        String babyName,
        String role
) {}
