package com.bediary.dto;

import java.time.LocalDate;
import java.util.UUID;

public record BabyJournalResponse(
        UUID familyId,
        String babyName,
        String babyAvatarUrl,
        LocalDate babyDob,
        String babyGender,
        String role,
        boolean active
) {}
