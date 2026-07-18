package com.bediary.service;

import com.bediary.entity.Family;
import com.bediary.entity.GrowthRecord;
import com.bediary.entity.HealthRecord;
import com.bediary.entity.TrackingLog;
import com.bediary.entity.VaccinationRecord;
import com.bediary.repository.GrowthRecordRepository;
import com.bediary.repository.HealthRecordRepository;
import com.bediary.repository.TrackingLogRepository;
import com.bediary.repository.VaccinationRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiContextBuilderService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm").withZone(APP_ZONE);

    private final TrackingLogRepository trackingLogRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final VaccinationRecordRepository vaccinationRecordRepository;

    public String build(Family family) {
        StringBuilder builder = new StringBuilder();
        builder.append("Dữ liệu có cấu trúc từ app Bediary, ưu tiên dùng khi trả lời:\n");
        appendAgeReference(builder, family);
        appendTracking(builder, family);
        appendRecentTracking(builder, family);
        appendGrowth(builder, family);
        appendHealth(builder, family);
        appendVaccination(builder, family);
        return builder.toString();
    }

    private void appendAgeReference(StringBuilder builder, Family family) {
        long ageDays = ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now(APP_ZONE));
        builder.append("- Mốc tham khảo theo tuổi: ").append(referenceByAge(ageDays)).append("\n");
    }

    private void appendTracking(StringBuilder builder, Family family) {
        LocalDate today = LocalDate.now(APP_ZONE);
        Instant start = today.atStartOfDay(APP_ZONE).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(APP_ZONE).toInstant();
        List<TrackingLog> logs = trackingLogRepository.findDailyLogs(family.getId(), start, end);

        int feedCount = 0;
        double milkMl = 0;
        int sleepCount = 0;
        long sleepMinutes = 0;
        int peeCount = 0;
        int poopCount = 0;
        List<String> notableNotes = new ArrayList<>();

        for (TrackingLog log : logs) {
            String type = log.getActivityType();
            Map<String, Object> meta = safeMeta(log);
            String note = text(meta.get("note"));
            collectImportantNote(notableNotes, log, note);

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

        builder.append("- Nhật ký hôm nay trong app: ")
                .append(feedCount).append(" lần bú/ăn");
        if (milkMl > 0) builder.append(", tổng khoảng ").append(Math.round(milkMl)).append(" ml");
        builder.append("; ").append(sleepCount).append(" giấc ngủ");
        if (sleepMinutes > 0) builder.append(", tổng khoảng ").append(sleepMinutes).append(" phút");
        builder.append("; đi tiểu ").append(peeCount).append(" lần; đi tiêu ").append(poopCount).append(" lần.\n");

        if (logs.isEmpty()) {
            builder.append("- Chất lượng dữ liệu hôm nay: chưa có hoạt động nào được ghi trong app, không được kết luận về cả ngày của bé.\n");
        } else {
            builder.append("- Chất lượng dữ liệu hôm nay: chỉ phản ánh các hoạt động đã nhập vào app; nếu số lần bú/ngủ/tã thấp, hãy nói là app mới ghi nhận ít dữ liệu, không khẳng định chắc chắn bé chỉ có từng đó hoạt động.\n");
        }

        appendTodayTimeline(builder, logs);
        appendTrackingSignals(builder, feedCount, milkMl, sleepCount, sleepMinutes, peeCount, poopCount, notableNotes);
    }

    private void appendTodayTimeline(StringBuilder builder, List<TrackingLog> logs) {
        if (logs.isEmpty()) return;
        builder.append("- Chi tiết hoạt động hôm nay, mới nhất trước: ");
        logs.stream().limit(12).forEach(log -> builder
                .append("[")
                .append(TIME_FORMAT.format(log.getStartTime()))
                .append(" ")
                .append(activityLabel(log.getActivityType()))
                .append(detail(log))
                .append("] "));
        builder.append("\n");
    }

    private void appendTrackingSignals(
            StringBuilder builder,
            int feedCount,
            double milkMl,
            int sleepCount,
            long sleepMinutes,
            int peeCount,
            int poopCount,
            List<String> notableNotes
    ) {
        List<String> signals = new ArrayList<>();
        if (feedCount > 0 && feedCount < 4) {
            signals.add("app mới ghi nhận ít lần bú/ăn (" + feedCount + " lần), cần hỏi/nhắc ba mẹ kiểm tra có nhập đủ cả ngày chưa");
        }
        if (milkMl > 0 && milkMl < 300) {
            signals.add("tổng ml ghi nhận còn thấp (" + Math.round(milkMl) + " ml), nên đối chiếu với tuổi và số cữ thực tế");
        }
        if (sleepCount > 0 && sleepMinutes < 180) {
            signals.add("tổng ngủ ghi nhận thấp (" + sleepMinutes + " phút), có thể do chưa nhập đủ hoặc bé ngủ ít");
        }
        if (peeCount > 0 && peeCount < 4) {
            signals.add("số lần đi tiểu ghi nhận ít (" + peeCount + " lần); nếu thực tế cũng ít, cần theo dõi mất nước");
        }
        if (poopCount >= 3) {
            signals.add("đi tiêu nhiều lần trong dữ liệu app, cần hỏi thêm tính chất phân");
        }
        boolean noteMentionsFrequentPee = notableNotes.stream()
                .map(String::toLowerCase)
                .anyMatch(note -> note.contains("tiểu") && note.contains("nhiều"));
        if (noteMentionsFrequentPee && peeCount < 4) {
            signals.add("ghi chú có nói đi tiểu nhiều nhưng app chỉ ghi nhận " + peeCount + " lần đi tiểu/tã, cần nhắc ba mẹ nhập hoặc kiểm tra lại số tã ướt thực tế");
        }
        signals.addAll(notableNotes);

        if (!signals.isEmpty()) {
            builder.append("- Tín hiệu cần AI bám sát khi nhận xét: ")
                    .append(String.join("; ", signals))
                    .append(".\n");
            builder.append("- Yêu cầu phân tích: AI phải biến từng tín hiệu trên thành nhận xét và hành động cụ thể, không được gom lại thành câu chung chung.\n");
        }
    }

    private void appendRecentTracking(StringBuilder builder, Family family) {
        Instant from = Instant.now().minus(7, ChronoUnit.DAYS);
        List<TrackingLog> recent = trackingLogRepository.findRecentLogs(family.getId(), from);
        if (recent.isEmpty()) {
            builder.append("- Xu hướng 7 ngày gần đây: chưa có đủ dữ liệu.\n");
            return;
        }

        Map<LocalDate, List<TrackingLog>> byDay = recent.stream()
                .collect(java.util.stream.Collectors.groupingBy(log -> LocalDate.ofInstant(log.getStartTime(), APP_ZONE)));

        double totalMilk = 0;
        long totalSleep = 0;
        int daysWithFeed = 0;
        int daysWithSleep = 0;

        for (List<TrackingLog> dayLogs : byDay.values()) {
            double dayMilk = dayLogs.stream()
                    .filter(log -> "FEED".equals(log.getActivityType()))
                    .mapToDouble(log -> number(firstPresent(safeMeta(log), "value", "milkMl", "amountMl", "ml"), 0))
                    .sum();
            long daySleep = dayLogs.stream()
                    .filter(log -> "SLEEP".equals(log.getActivityType()))
                    .mapToLong(log -> sleepDuration(log, safeMeta(log)))
                    .sum();
            if (dayMilk > 0) {
                daysWithFeed++;
                totalMilk += dayMilk;
            }
            if (daySleep > 0) {
                daysWithSleep++;
                totalSleep += daySleep;
            }
        }

        builder.append("- Xu hướng 7 ngày gần đây từ app: ");
        if (daysWithFeed > 0) builder.append("trung bình ngày có nhập sữa khoảng ").append(Math.round(totalMilk / daysWithFeed)).append(" ml; ");
        else builder.append("chưa có dữ liệu sữa; ");
        if (daysWithSleep > 0) builder.append("trung bình ngày có nhập ngủ khoảng ").append(Math.round((double) totalSleep / daysWithSleep)).append(" phút.");
        else builder.append("chưa có dữ liệu ngủ.");
        builder.append("\n");
    }

    private void appendGrowth(StringBuilder builder, Family family) {
        growthRecordRepository.findFirstByFamilyIdOrderByRecordedAtDesc(family.getId()).ifPresentOrElse(record -> {
            builder.append("- Tăng trưởng mới nhất: ");
            if (record.getWeightKg() != null) {
                builder.append("cân nặng ").append(record.getWeightKg()).append(" kg");
                appendGrowthStatus(builder, record, true);
            } else {
                builder.append("chưa có cân nặng");
            }
            builder.append("; ");
            if (record.getHeightCm() != null) {
                builder.append("chiều cao ").append(record.getHeightCm()).append(" cm");
                appendGrowthStatus(builder, record, false);
            } else {
                builder.append("chưa có chiều cao");
            }
            builder.append("; ngày ghi ").append(LocalDate.ofInstant(record.getRecordedAt(), APP_ZONE)).append(".\n");
        }, () -> builder.append("- Tăng trưởng mới nhất: chưa có dữ liệu cân nặng/chiều cao.\n"));
    }

    private void appendGrowthStatus(StringBuilder builder, GrowthRecord record, boolean weight) {
        String status = weight ? record.getWeightStatus() : record.getHeightStatus();
        Double percentile = weight ? record.getWeightPercentile() : record.getHeightPercentile();
        Double zScore = weight ? record.getWeightZScore() : record.getHeightZScore();
        if (status != null) builder.append(" (").append(status).append(")");
        if (percentile != null) builder.append(", percentile ").append(Math.round(percentile));
        if (zScore != null) builder.append(", Z ").append(roundOne(zScore));
    }

    private void appendHealth(StringBuilder builder, Family family) {
        List<HealthRecord> records = healthRecordRepository.findByFamilyIdOrderByEventDateDescCreatedAtDesc(family.getId());
        List<HealthRecord> activeMeds = records.stream()
                .filter(r -> r.getRecordType() == HealthRecord.Type.MEDICATION && r.getMedicationStatus() == HealthRecord.MedicationStatus.ACTIVE)
                .limit(5)
                .toList();
        List<HealthRecord> alerts = records.stream()
                .filter(r -> r.getRecordType() == HealthRecord.Type.ALLERGY || r.getRecordType() == HealthRecord.Type.CONDITION)
                .limit(5)
                .toList();
        LocalDate today = LocalDate.now(APP_ZONE);
        List<HealthRecord> upcoming = records.stream()
                .filter(r -> r.getNextFollowUpDate() != null && !r.getNextFollowUpDate().isBefore(today))
                .sorted(Comparator.comparing(HealthRecord::getNextFollowUpDate))
                .limit(3)
                .toList();

        builder.append("- Sổ sức khỏe: thuốc đang dùng ");
        builder.append(activeMeds.isEmpty() ? "không có dữ liệu" : joinHealth(activeMeds));
        builder.append("; dị ứng/bệnh lý lưu ý ");
        builder.append(alerts.isEmpty() ? "không có dữ liệu" : joinHealth(alerts));
        builder.append("; lịch khám/tái khám sắp tới ");
        builder.append(upcoming.isEmpty() ? "không có dữ liệu" : joinFollowUps(upcoming));
        builder.append(".\n");
    }

    private void appendVaccination(StringBuilder builder, Family family) {
        LocalDate today = LocalDate.now(APP_ZONE);
        List<VaccinationRecord> upcoming = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(family.getId(), today, today.plusDays(90))
                .stream()
                .limit(5)
                .toList();
        List<VaccinationRecord> overdue = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateLessThanEqual(family.getId(), today.minusDays(1))
                .stream()
                .limit(5)
                .toList();

        builder.append("- Tiêm chủng: sắp tới ");
        builder.append(upcoming.isEmpty() ? "không có dữ liệu" : joinVaccines(upcoming));
        builder.append("; quá hạn/chưa hoàn tất ");
        builder.append(overdue.isEmpty() ? "không có dữ liệu" : joinVaccines(overdue));
        builder.append(".\n");
    }

    private String referenceByAge(long ageDays) {
        if (ageDays < 90) {
            return "bé dưới 3 tháng thường cần nhiều cữ bú trong ngày, ngủ tổng khoảng 14-17 giờ/ngày; sau giai đoạn sữa đã ổn, thường theo dõi tã ướt khoảng 6+ lần/ngày. Đây là mốc tham khảo, không thay thế bác sĩ.";
        }
        if (ageDays < 180) {
            return "bé 3-6 tháng thường ngủ khoảng 12-16 giờ/ngày, bú nhiều cữ trong ngày; theo dõi số tã ướt, màu nước tiểu và dấu hiệu mất nước.";
        }
        if (ageDays < 365) {
            return "bé 6-12 tháng thường ngủ khoảng 12-15 giờ/ngày; dinh dưỡng gồm sữa và ăn dặm phù hợp tuổi, cần theo dõi phản ứng với món mới.";
        }
        if (ageDays < 730) {
            return "bé 1-2 tuổi thường ngủ khoảng 11-14 giờ/ngày; ăn đa dạng nhóm chất, hạn chế đồ ngọt/mặn và duy trì vận động phù hợp.";
        }
        return "trẻ trên 2 tuổi thường ngủ khoảng 10-13 giờ/ngày; chú ý ăn đa dạng, vận động, lịch tiêm và khám định kỳ.";
    }

    private void collectImportantNote(List<String> notableNotes, TrackingLog log, String note) {
        if (note.isBlank()) return;
        String lower = note.toLowerCase();
        List<String> keywords = List.of(
                "tiêu chảy", "phan loãng", "phân lỏng", "máu", "nhầy", "vàng đậm", "ít tiểu",
                "tiểu ít", "tiểu nhiều", "đi tiểu nhiều", "sốt", "bỏ bú", "nôn", "li bì", "khó thở", "quấy", "khóc"
        );
        boolean important = keywords.stream().anyMatch(lower::contains);
        if (important) {
            notableNotes.add(TIME_FORMAT.format(log.getStartTime()) + " " + activityLabel(log.getActivityType()) + " có ghi chú: " + limitText(note, 140));
        }
    }

    private String detail(TrackingLog log) {
        Map<String, Object> meta = safeMeta(log);
        List<String> parts = new ArrayList<>();
        if ("FEED".equals(log.getActivityType())) {
            double ml = number(firstPresent(meta, "value", "milkMl", "amountMl", "ml"), 0);
            if (ml > 0) parts.add(Math.round(ml) + " ml");
            String food = text(firstPresent(meta, "food", "meal", "foodName"));
            if (!food.isBlank()) parts.add(food);
        } else if ("SLEEP".equals(log.getActivityType())) {
            long minutes = sleepDuration(log, meta);
            if (minutes > 0) parts.add(minutes + " phút");
        } else if ("PEE".equals(log.getActivityType()) || "POOP".equals(log.getActivityType()) || "DIAPER".equals(log.getActivityType())) {
            String diaper = text(firstPresent(meta, "diaper_type", "diaperType", "stoolType", "peeColor"));
            if (!diaper.isBlank()) parts.add(diaper);
        }
        String note = text(meta.get("note"));
        if (!note.isBlank()) parts.add("ghi chú: " + limitText(note, 90));
        return parts.isEmpty() ? "" : " - " + String.join(", ", parts);
    }

    private long sleepDuration(TrackingLog log, Map<String, Object> meta) {
        double fromMeta = number(firstPresent(meta, "durationMinutes", "duration", "minutes"), -1);
        if (fromMeta >= 0) return Math.round(fromMeta);
        if (log.getEndTime() != null) {
            long minutes = ChronoUnit.MINUTES.between(log.getStartTime(), log.getEndTime());
            return Math.max(minutes, 0);
        }
        return 0;
    }

    private String activityLabel(String type) {
        return switch (String.valueOf(type)) {
            case "FEED" -> "bú/ăn";
            case "SLEEP" -> "ngủ";
            case "PEE" -> "đi tiểu";
            case "POOP" -> "đi tiêu";
            case "DIAPER" -> "tã";
            default -> String.valueOf(type).toLowerCase();
        };
    }

    private String joinHealth(List<HealthRecord> records) {
        return records.stream()
                .map(r -> r.getTitle() + (r.getMedicationDosage() != null ? " - " + r.getMedicationDosage() : ""))
                .reduce((a, b) -> a + "; " + b)
                .orElse("không có dữ liệu");
    }

    private String joinFollowUps(List<HealthRecord> records) {
        return records.stream()
                .map(r -> r.getTitle() + " ngày " + r.getNextFollowUpDate())
                .reduce((a, b) -> a + "; " + b)
                .orElse("không có dữ liệu");
    }

    private String joinVaccines(List<VaccinationRecord> records) {
        return records.stream()
                .map(r -> r.getVaccineName() + " mũi " + r.getDoseNumber() + " ngày " + r.getScheduledDate())
                .reduce((a, b) -> a + "; " + b)
                .orElse("không có dữ liệu");
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
        if (value instanceof Number n) return n.doubleValue();
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

    private String limitText(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) return Objects.toString(value, "");
        return value.substring(0, maxLength - 3) + "...";
    }

    private double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
