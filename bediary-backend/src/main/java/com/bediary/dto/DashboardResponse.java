package com.bediary.dto;

import java.util.List;
import java.time.LocalDate;

/**
 * Top-level dashboard response aggregating all baby-related widgets.
 */
public record DashboardResponse(
        String babyName,
        LocalDate babyBirthday,
        String babyNickname,
        /** e.g. "1 tuổi 2 tháng 5 ngày" */
        String babyAgeText,
        long babyAgeDays,
        List<VaccinationSummary> upcomingVaccinations,
        List<CareTipResponse> todayCareTips,
        List<MediaPostResponse> latestPosts,
        StreakResponse streak,
        /** True if last growth record was recorded more than 30 days ago */
        boolean growthReminder,
        List<RoutineResponse> todayRoutines
) {
    /** Compact vaccination info shown on the dashboard */
    public record VaccinationSummary(
            java.util.UUID id,
            String vaccineName,
            int doseNumber,
            java.time.LocalDate scheduledDate,
            boolean isOverdue
    ) {}
}
