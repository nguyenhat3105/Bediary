package com.bediary.dto;

import java.time.LocalDate;

public record StreakResponse(
        int currentStreak,
        int longestStreak,
        LocalDate lastActivityDate
) {}
