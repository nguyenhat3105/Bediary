package com.bediary.dto;

public record AuthSession(
        AuthResponse response,
        String refreshToken
) {}
