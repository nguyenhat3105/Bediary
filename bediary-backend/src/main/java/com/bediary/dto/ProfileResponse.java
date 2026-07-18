package com.bediary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProfileResponse(
        // User info
        UUID userId,
        String fullName,
        String email,
        String avatarUrl,
        Instant memberSince,
        // Baby info
        String babyName,
        String babyAvatarUrl,
        LocalDate babyDob,
        String babyGender,
        String babyAgeText,
        // Family
        UUID familyId,
        String inviteCode,
        String currentUserRole,
        List<MemberInfo> members
) {
    public record MemberInfo(
            UUID userId,
            String fullName,
            String avatarUrl,
            String role,       // ADMIN | PARENT | CAREGIVER | VIEWER
            String roleLabel   // "Ba mẹ" | "Người chăm sóc" | "Người thân"
    ) {}
}
