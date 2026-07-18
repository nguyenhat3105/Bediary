package com.bediary.dto;

public record UpdateProfileRequest(
        String fullName,   // nullable - only update if provided
        String avatarUrl   // nullable
) {}
