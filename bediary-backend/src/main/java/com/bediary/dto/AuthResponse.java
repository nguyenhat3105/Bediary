package com.bediary.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String email,
        String fullName,
        UUID familyId,
        String role
) {}
