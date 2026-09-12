package com.bediary.service;

import com.bediary.entity.Family;
import com.bediary.entity.GrowthRecord;
import com.bediary.entity.TrackingLog;
import com.bediary.entity.VaccinationRecord;
import com.bediary.repository.GrowthRecordRepository;
import com.bediary.repository.TrackingLogRepository;
import com.bediary.repository.VaccinationRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BabyAnalyticsService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int LOOKBACK_DAYS = 7;

    private final TrackingLogRepository trackingLogRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final BabyAnalyticsRuleEngine babyAnalyticsRuleEngine;

    @Transactional(readOnly = true)
    public String buildAnalyticsContext(Family family) {
        BabyAnalyticsSnapshot snapshot = analyze(family);
        return snapshot.toPromptText();
    }

    @Transactional(readOnly = true)
    public BabyAnalyticsSnapshot analyze(Family family) {
        UUID familyId = family.getId();
        LocalDate today = LocalDate.now(APP_ZONE);
        DailyMetrics todayMetrics = dailyMetrics(familyId, today);
        BaselineMetrics baseline = baselineMetrics(familyId, today.minusDays(LOOKBACK_DAYS), today.minusDays(1));

        BabyAnalyticsContext context = new BabyAnalyticsContext(
                family,
                todayMetrics,
                baseline,
                recentGrowthRecords(familyId),
                overdueVaccinations(familyId, today),
                upcomingVaccinations(familyId, today)
        );
        List<DetectedPattern> patterns = babyAnalyticsRuleEngine.evaluate(context);
        return new BabyAnalyticsSnapshot(todayMetrics, baseline, patterns);
    }

    private List<GrowthRecord> recentGrowthRecords(UUID familyId) {
        return growthRecordRepository
                .findByFamilyIdOrderByRecordedAtDesc(familyId, PageRequest.of(0, 4))
                .getContent();
    }

    private List<VaccinationRecord> overdueVaccinations(UUID familyId, LocalDate today) {
        return vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateLessThanEqual(familyId, today.minusDays(1))
                .stream()
                .filter(this::isScheduled)
                .toList();
    }

    private List<VaccinationRecord> upcomingVaccinations(UUID familyId, LocalDate today) {
        return vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(familyId, today, today.plusDays(7))
                .stream()
                .filter(this::isScheduled)
                .toList();
    }

    private boolean isScheduled(VaccinationRecord record) {
        return record.getStatus() == null || record.getStatus() == VaccinationRecord.Status.SCHEDULED;
    }

    private DailyMetrics dailyMetrics(UUID familyId, LocalDate date) {
        Instant start = date.atStartOfDay(APP_ZONE).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(APP_ZONE).toInstant();
        return summarize(trackingLogRepository.findDailyLogs(familyId, start, end), date);
    }

    private BaselineMetrics baselineMetrics(UUID familyId, LocalDate fromDate, LocalDate toDate) {
        Instant from = fromDate.atStartOfDay(APP_ZONE).toInstant();
        Instant to = toDate.plusDays(1).atStartOfDay(APP_ZONE).toInstant();
        List<TrackingLog> logs = trackingLogRepository.findRecentLogs(familyId, from)
                .stream()
                .filter(log -> log.getStartTime().isBefore(to))
                .toList();
        Map<LocalDate, List<TrackingLog>> byDay = logs.stream()
                .collect(Collectors.groupingBy(log -> LocalDate.ofInstant(log.getStartTime(), APP_ZONE)));
        if (byDay.isEmpty()) return new BaselineMetrics(0, 0, 0, 0);

        List<DailyMetrics> days = byDay.entrySet().stream()
                .map(entry -> summarize(entry.getValue(), entry.getKey()))
                .sorted(Comparator.comparing(DailyMetrics::date))
                .toList();

        return new BaselineMetrics(
                days.size(),
                days.stream().mapToDouble(DailyMetrics::milkMl).average().orElse(0),
                days.stream().mapToDouble(DailyMetrics::sleepMinutes).average().orElse(0),
                days.stream().mapToDouble(DailyMetrics::totalLogs).average().orElse(0)
        );
    }

    private DailyMetrics summarize(List<TrackingLog> logs, LocalDate date) {
        int feedCount = 0;
        double milkMl = 0;
        int sleepCount = 0;
        long sleepMinutes = 0;
        int peeCount = 0;
        int poopCount = 0;

        for (TrackingLog log : logs) {
            String type = log.getActivityType();
            Map<String, Object> meta = safeMeta(log);
            if ("FEED".equals(type)) {
                feedCount++;
                milkMl += number(firstPresent(meta, "value", "milkMl", "amountMl", "ml"), 0);
            } else if ("SLEEP".equals(type)) {
                sleepCount++;
                sleepMinutes += sleepDuration(log, meta);
            } else if ("PEE".equals(type)) {
                peeCount++;
            } else if ("POOP".equals(type)) {
                poopCount++;
            } else if ("DIAPER".equals(type)) {
                String diaperType = text(firstPresent(meta, "diaper_type", "diaperType", "type")).toUpperCase();
                if (diaperType.contains("POOP") || diaperType.contains("STOOL")) poopCount++;
                else peeCount++;
            }
        }

        return new DailyMetrics(date, logs.size(), feedCount, milkMl, sleepCount, sleepMinutes, peeCount, poopCount);
    }

    private long sleepDuration(TrackingLog log, Map<String, Object> meta) {
        double fromMeta = number(firstPresent(meta, "durationMinutes", "duration", "minutes"), -1);
        if (fromMeta >= 0) return Math.round(fromMeta);
        if (log.getEndTime() == null) return 0;
        return Math.max(0, ChronoUnit.MINUTES.between(log.getStartTime(), log.getEndTime()));
    }

    private Map<String, Object> safeMeta(TrackingLog log) {
        return log.getMetadata() == null ? Map.of() : log.getMetadata();
    }

    private Object firstPresent(Map<String, Object> meta, String... keys) {
        for (String key : keys) {
            Object value = meta.get(key);
            if (value != null && !String.valueOf(value).isBlank()) return value;
        }
        return null;
    }

    private double number(Object value, double fallback) {
        if (value instanceof Number number) return number.doubleValue();
        if (value == null) return fallback;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String text(Object value) {
        return Objects.toString(value, "").trim();
    }

    public record BabyAnalyticsSnapshot(
            DailyMetrics today,
            BaselineMetrics baseline,
            List<DetectedPattern> patterns
    ) {
        public String toPromptText() {
            StringBuilder builder = new StringBuilder();
            builder.append("Tầng Baby Analytics Service - các pattern đã phát hiện trước khi gửi LLM:\n");
            builder.append("- Hôm nay: ")
                    .append(today.totalLogs()).append(" log; ")
                    .append(today.feedCount()).append(" cữ bú/ăn");
            if (today.milkMl() > 0) builder.append(", ").append(Math.round(today.milkMl())).append(" ml");
            builder.append("; ").append(today.sleepCount()).append(" giấc ngủ");
            if (today.sleepMinutes() > 0) builder.append(", ").append(today.sleepMinutes()).append(" phút");
            builder.append("; đi tiểu ").append(today.peeCount()).append(" lần; đi tiêu ").append(today.poopCount()).append(" lần.\n");
            builder.append("- Baseline ").append(LOOKBACK_DAYS).append(" ngày: ")
                    .append(baseline.trackedDays()).append(" ngày có dữ liệu; trung bình ")
                    .append(Math.round(baseline.averageMilkMl())).append(" ml/ngày; ")
                    .append(Math.round(baseline.averageSleepMinutes())).append(" phút ngủ/ngày; ")
                    .append(Math.round(baseline.averageLogs())).append(" log/ngày.\n");
            if (patterns.isEmpty()) {
                builder.append("- Detected Events/Patterns: chưa phát hiện pattern nổi bật; vẫn cần nói rõ nếu dữ liệu app còn thiếu.\n");
            } else {
                builder.append("- Detected Events/Patterns:\n");
                patterns.forEach(pattern -> builder
                        .append("  + [").append(pattern.severity()).append("] ")
                        .append(pattern.code()).append(": ")
                        .append(pattern.title()).append(" - ")
                        .append(pattern.explanation()).append("\n"));
            }
            builder.append("- Cách dùng cho LLM: giải thích các pattern trên bằng ngôn ngữ dễ hiểu, cá nhân hóa theo tuổi bé và dữ liệu app, không chẩn đoán/không kê thuốc.\n");
            return builder.toString();
        }
    }

    public record BabyAnalyticsContext(
            Family family,
            DailyMetrics today,
            BaselineMetrics baseline,
            List<GrowthRecord> recentGrowthRecords,
            List<VaccinationRecord> overdueVaccinations,
            List<VaccinationRecord> upcomingVaccinations
    ) {}

    public record DailyMetrics(
            LocalDate date,
            int totalLogs,
            int feedCount,
            double milkMl,
            int sleepCount,
            long sleepMinutes,
            int peeCount,
            int poopCount
    ) {}

    public record BaselineMetrics(
            int trackedDays,
            double averageMilkMl,
            double averageSleepMinutes,
            double averageLogs
    ) {}

    public record DetectedPattern(
            String code,
            String severity,
            String title,
            String explanation
    ) {}
}
