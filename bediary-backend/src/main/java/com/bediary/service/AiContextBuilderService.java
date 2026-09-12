package com.bediary.service;

import com.bediary.entity.Family;
import com.bediary.entity.GrowthRecord;
import com.bediary.entity.TrackingLog;
import com.bediary.entity.VaccinationRecord;
import com.bediary.repository.GrowthRecordRepository;
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
    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final BabyAnalyticsService babyAnalyticsService;

    public String buildForQuestion(Family family, String question) {
        String q = java.text.Normalizer.normalize(question.toLowerCase(java.util.Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd');
        boolean sleep = hasTopic(q, "ngu|giac");
        boolean feed = hasTopic(q, "bu|an|sua|ml");
        boolean diaper = hasTopic(q, "tieu|ta|phan|ngoai");
        boolean growth = hasTopic(q, "can nang|chieu cao|tang truong");
        boolean vaccine = hasTopic(q, "tiem|vaccine|vac xin");
        boolean health = hasTopic(q, "ho|sot|non|kho tho|tieu chay|bu kem|li bi|nghet mui");
        boolean all = !sleep && !feed && !diaper && !growth && !vaccine;
        LocalDate date = LocalDate.now(APP_ZONE);
        if (q.contains("hom qua") && !q.contains("hom nay")) date = date.minusDays(1);
        if (q.contains("hom kia")) date = date.minusDays(2);
        java.util.regex.Matcher explicit = java.util.regex.Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}\\b").matcher(q);
        if (explicit.find()) {
            try { date = LocalDate.parse(explicit.group()); }
            catch (java.time.format.DateTimeParseException e) { return "Ngày yêu cầu không hợp lệ; cần xác nhận lại ngày, không thay bằng hôm nay."; }
        }
        boolean trend = hasTopic(q, "7 ngay|tuan nay|tuan truoc|gan day|dao nay|xu huong|so sanh|giam|tang");
        int daysBack = trend ? 6 : 0;
        if (q.contains("tuan nay")) daysBack = date.getDayOfWeek().getValue() - 1;
        if (q.contains("tuan truoc")) date = date.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).minusDays(1);
        StringBuilder out = new StringBuilder("Dữ liệu app theo câu hỏi (múi giờ Asia/Ho_Chi_Minh):\n");
        out.append("Chỉ phản ánh hoạt động đã nhập, không chứng minh cả ngày đầy đủ. Giá trị nhập nhanh có thể là mặc định.\n");
        for (int offset = daysBack; offset >= 0; offset--) {
            LocalDate day = date.minusDays(offset);
            List<TrackingLog> logs = trackingLogRepository.findDailyLogs(family.getId(), day.atStartOfDay(APP_ZONE).toInstant(), day.plusDays(1).atStartOfDay(APP_ZONE).toInstant());
            out.append("Ngày ").append(day).append(":\n");
            List<TrackingLog> selected = logs.stream().filter(item -> switch (item.getActivityType()) {
                case "FEED" -> all || feed || health;
                case "SLEEP" -> all || sleep || health;
                case "DIAPER", "PEE", "POOP" -> all || diaper || health;
                default -> all || health;
            }).toList();
            if (selected.isEmpty()) { out.append("Chưa ghi nhận hoạt động thuộc chủ đề này.\n"); continue; }
            List<TrackingLog> feeds = selected.stream().filter(item -> "FEED".equals(item.getActivityType())).toList();
            if (!feeds.isEmpty()) {
                long known = feeds.stream().filter(item -> milkAmount(safeMeta(item)) != null).count();
                double ml = feeds.stream().mapToDouble(item -> number(milkAmount(safeMeta(item)), 0)).sum();
                out.append("Bú/ăn: ").append(feeds.size()).append(" cữ; tổng lượng đã nhập ").append(Math.round(ml))
                        .append(" ml; ").append(feeds.size() - known).append(" cữ chưa có lượng ml.\n");
            }
            List<TrackingLog> sleeps = selected.stream().filter(item -> "SLEEP".equals(item.getActivityType())).toList();
            if (!sleeps.isEmpty()) out.append("Ngủ: ").append(sleeps.size()).append(" lần; tổng phút đã nhập ")
                    .append(sleeps.stream().mapToLong(item -> sleepDuration(item, safeMeta(item))).sum()).append(".\n");
            long pee = selected.stream().filter(item -> "PEE".equals(item.getActivityType()) || ("DIAPER".equals(item.getActivityType()) && hasTopic(text(firstPresent(safeMeta(item), "diaper_type", "diaperType")).toLowerCase(), "wet|pee|both"))).count();
            long poop = selected.stream().filter(item -> "POOP".equals(item.getActivityType()) || ("DIAPER".equals(item.getActivityType()) && hasTopic(text(firstPresent(safeMeta(item), "diaper_type", "diaperType")).toLowerCase(), "poop|stool|both"))).count();
            if (all || diaper || health) out.append("Đi tiểu ").append(pee).append("; đi tiêu ").append(poop).append(" lần.\n");
            selected.stream().sorted(java.util.Comparator.comparing(TrackingLog::getStartTime).reversed()).limit(trend ? 4 : 12)
                    .forEach(item -> out.append(TIME_FORMAT.format(item.getStartTime())).append(" ").append(activityLabel(item.getActivityType())).append(detail(item)).append("\n"));
        }
        if (growth) appendGrowth(out, family);
        if (vaccine) appendVaccination(out, family);
        if (all && !health && date.equals(LocalDate.now(APP_ZONE))) {
            out.append(babyAnalyticsService.buildAnalyticsContext(family));
        }
        out.append("Chỉ so sánh những ngày đã có số liệu; không xem ngày trống là 0 thực tế. Khoảng thời gian khác chưa có trong context phải nói rõ hoặc hỏi lại.\n");
        return out.toString();
    }

    private boolean hasTopic(String text, String expression) {
        return java.util.regex.Pattern.compile("(?<![a-z0-9])(?:" + expression + ")(?![a-z0-9])").matcher(text).find();
    }

    private Object milkAmount(Map<String, Object> meta) {
        Object explicitMl = firstPresent(meta, "milkMl", "amountMl", "ml");
        if (explicitMl != null) return explicitMl;
        String unit = text(meta.get("unit"));
        return unit.isBlank() || "ml".equalsIgnoreCase(unit) ? meta.get("value") : null;
    }

    public String build(Family family) {
        StringBuilder builder = new StringBuilder();
        builder.append("Dữ liệu có cấu trúc từ app Bediary, ưu tiên dùng khi trả lời:\n");
        appendAgeReference(builder, family);
        builder.append(babyAnalyticsService.buildAnalyticsContext(family));
        appendTracking(builder, family);
        appendRecentTracking(builder, family);
        appendGrowth(builder, family);
        appendVaccination(builder, family);
        return builder.toString();
    }

    public String buildTrackingContext(Family family) {
        StringBuilder builder = new StringBuilder();
        builder.append("Route Tracking AI - dữ liệu nhật ký thực tế từ database:\n");
        appendAgeReference(builder, family);
        appendTracking(builder, family);
        appendRecentTracking(builder, family);
        return builder.toString();
    }

    public String buildAnalyticsContext(Family family) {
        StringBuilder builder = new StringBuilder();
        builder.append("Route Insight AI - dữ liệu đã qua Baby Analytics/Rule Engine:\n");
        appendAgeReference(builder, family);
        builder.append(babyAnalyticsService.buildAnalyticsContext(family));
        appendGrowth(builder, family);
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

    private void appendVaccination(StringBuilder builder, Family family) {
        LocalDate today = LocalDate.now(APP_ZONE);
        List<VaccinationRecord> upcoming = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(family.getId(), today, today.plusDays(90))
                .stream()
                .filter(this::isScheduledVaccination)
                .limit(5)
                .toList();
        List<VaccinationRecord> overdue = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateLessThanEqual(family.getId(), today.minusDays(1))
                .stream()
                .filter(this::isScheduledVaccination)
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

    private String joinVaccines(List<VaccinationRecord> records) {
        return records.stream()
                .map(r -> r.getVaccineName() + " mũi " + r.getDoseNumber() + " ngày " + r.getScheduledDate())
                .reduce((a, b) -> a + "; " + b)
                .orElse("không có dữ liệu");
    }

    private boolean isScheduledVaccination(VaccinationRecord record) {
        return record.getStatus() == null || record.getStatus() == VaccinationRecord.Status.SCHEDULED;
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
