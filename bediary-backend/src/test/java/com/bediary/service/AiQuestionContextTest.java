package com.bediary.service;

import com.bediary.entity.*;
import com.bediary.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiQuestionContextTest {
    @Test void currentWeekStartsOnMondayAndSolidFoodGramsAreNotMilk() {
        var tracking = mock(TrackingLogRepository.class);
        var service = new AiContextBuilderService(tracking, mock(GrowthRecordRepository.class), mock(VaccinationRecordRepository.class), mock(BabyAnalyticsService.class));
        var family = new Family(); family.setId(UUID.randomUUID());
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zone);
        var meal = TrackingLog.builder().activityType("FEED").startTime(Instant.now()).metadata(Map.of("value", 100, "unit", "g", "food", "cháo")).build();
        when(tracking.findDailyLogs(any(), any(), any())).thenReturn(List.of(meal));
        String context = service.buildForQuestion(family, "Tuần này bé ăn bao nhiêu?");
        assertFalse(context.contains("tổng lượng đã nhập 100 ml"));
        LocalDate monday = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        verify(tracking).findDailyLogs(family.getId(), monday.atStartOfDay(zone).toInstant(), monday.plusDays(1).atStartOfDay(zone).toInstant());
        verify(tracking, times(today.getDayOfWeek().getValue())).findDailyLogs(any(), any(), any());
    }

    @Test void yesterdayMilkQuestionUsesCorrectDayAndOmitsSleepAndUnrelatedRecords() {
        var tracking = mock(TrackingLogRepository.class);
        var growth = mock(GrowthRecordRepository.class);
        var vaccines = mock(VaccinationRecordRepository.class);
        var analytics = mock(BabyAnalyticsService.class);
        var service = new AiContextBuilderService(tracking, growth, vaccines, analytics);
        var family = new Family(); family.setId(UUID.randomUUID());
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate date = LocalDate.now(zone).minusDays(1);
        Instant start = date.atStartOfDay(zone).toInstant();
        var feed = TrackingLog.builder().activityType("FEED").startTime(start).metadata(Map.of("value", 120)).build();
        var unknown = TrackingLog.builder().activityType("FEED").startTime(start.plusSeconds(3600)).metadata(Map.of()).build();
        var sleep = TrackingLog.builder().activityType("SLEEP").startTime(start).metadata(Map.of("durationMinutes", 15)).build();
        when(tracking.findDailyLogs(family.getId(), start, date.plusDays(1).atStartOfDay(zone).toInstant())).thenReturn(List.of(feed, unknown, sleep));
        String context = service.buildForQuestion(family, "Hôm qua bé bú bao nhiêu ml?");
        assertTrue(context.contains(date.toString()));
        assertTrue(context.contains("120 ml; 1 cữ chưa có lượng ml"));
        assertFalse(context.contains("Ngủ:"));
        verifyNoInteractions(growth, vaccines, analytics);
    }
}
