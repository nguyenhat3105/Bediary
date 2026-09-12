package com.bediary.service;

import com.bediary.entity.GrowthRecord;
import com.bediary.entity.VaccinationRecord;
import com.bediary.service.BabyAnalyticsService.BabyAnalyticsContext;
import com.bediary.service.BabyAnalyticsService.DetectedPattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BabyAnalyticsRuleEngine {

    private static final double SIGNIFICANT_DROP_RATIO = 0.15;

    private final List<BabyAnalyticsRule> rules = List.of(
            new TrackingDropRule(),
            new DataQualityRule(),
            new GrowthTrendRule(),
            new VaccinationRule()
    );

    public List<DetectedPattern> evaluate(BabyAnalyticsContext context) {
        return rules.stream()
                .flatMap(rule -> rule.evaluate(context).stream())
                .sorted(Comparator
                        .comparingInt((DetectedPattern pattern) -> severityRank(pattern.severity()))
                        .thenComparing(DetectedPattern::code))
                .toList();
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "HIGH" -> 0;
            case "MEDIUM" -> 1;
            case "LOW" -> 2;
            default -> 3;
        };
    }

    private interface BabyAnalyticsRule {
        List<DetectedPattern> evaluate(BabyAnalyticsContext context);
    }

    private static class TrackingDropRule implements BabyAnalyticsRule {
        @Override
        public List<DetectedPattern> evaluate(BabyAnalyticsContext context) {
            List<DetectedPattern> patterns = new ArrayList<>();
            addDropPattern(
                    patterns,
                    "SLEEP_DROP",
                    "Giấc ngủ giảm so với xu hướng 7 ngày",
                    context.today().sleepMinutes(),
                    context.baseline().averageSleepMinutes(),
                    "Tổng ngủ hôm nay thấp hơn baseline; cần hỏi xem app đã nhập đủ giấc ngủ chưa và quan sát bé có mệt/quấy không."
            );
            addDropPattern(
                    patterns,
                    "FEEDING_DROP",
                    "Lượng bú/ăn giảm so với xu hướng 7 ngày",
                    context.today().milkMl(),
                    context.baseline().averageMilkMl(),
                    "Tổng lượng sữa/ăn hôm nay thấp hơn baseline; cần kiểm tra số cữ thực tế, tổng ml và dấu hiệu bỏ bú/ăn kém."
            );
            return patterns;
        }

        private void addDropPattern(
                List<DetectedPattern> patterns,
                String code,
                String title,
                double todayValue,
                double baselineValue,
                String recommendation
        ) {
            if (todayValue <= 0 || baselineValue <= 0) return;
            double dropRatio = (baselineValue - todayValue) / baselineValue;
            if (dropRatio < SIGNIFICANT_DROP_RATIO) return;

            patterns.add(new DetectedPattern(
                    code,
                    dropRatio >= 0.30 ? "HIGH" : "MEDIUM",
                    title,
                    "Hôm nay " + Math.round(todayValue) + ", baseline khoảng " + Math.round(baselineValue)
                            + ", giảm " + Math.round(dropRatio * 100) + "%. " + recommendation
            ));
        }
    }

    private static class DataQualityRule implements BabyAnalyticsRule {
        @Override
        public List<DetectedPattern> evaluate(BabyAnalyticsContext context) {
            List<DetectedPattern> patterns = new ArrayList<>();
            var today = context.today();
            var baseline = context.baseline();

            if (today.totalLogs() == 0) {
                patterns.add(new DetectedPattern(
                        "NO_TODAY_LOGS",
                        "LOW",
                        "Hôm nay chưa có dữ liệu nhật ký",
                        "Không nên kết luận về sinh hoạt cả ngày; cần nhắc ba mẹ nhập thêm bú/ăn, ngủ và tã."
                ));
                return patterns;
            }
            if (baseline.trackedDays() < 3) {
                patterns.add(new DetectedPattern(
                        "LOW_BASELINE_CONFIDENCE",
                        "LOW",
                        "Baseline 7 ngày còn ít dữ liệu",
                        "Các so sánh xu hướng chỉ mang tính tham khảo vì số ngày có dữ liệu chưa đủ."
                ));
            }
            if (today.feedCount() > 0 && today.feedCount() < 4) {
                patterns.add(new DetectedPattern(
                        "LOW_FEED_LOG_COUNT",
                        "MEDIUM",
                        "Số cữ bú/ăn hôm nay được ghi nhận còn ít",
                        "App mới ghi nhận " + today.feedCount() + " cữ; cần hỏi ba mẹ đã nhập đủ chưa."
                ));
            }
            if (today.peeCount() > 0 && today.peeCount() < 4) {
                patterns.add(new DetectedPattern(
                        "LOW_PEE_COUNT",
                        "MEDIUM",
                        "Số lần đi tiểu/tã ướt được ghi nhận ít",
                        "Nếu thực tế cũng ít, cần theo dõi mất nước: tã ướt, màu nước tiểu, môi/miệng khô và mức tỉnh táo."
                ));
            }
            if (today.poopCount() >= 3) {
                patterns.add(new DetectedPattern(
                        "FREQUENT_STOOL",
                        "MEDIUM",
                        "Đi tiêu nhiều lần trong ngày",
                        "Cần hỏi thêm phân có lỏng, nhầy, máu, sốt hoặc nôn không."
                ));
            }
            return patterns;
        }
    }

    private static class GrowthTrendRule implements BabyAnalyticsRule {
        @Override
        public List<DetectedPattern> evaluate(BabyAnalyticsContext context) {
            List<GrowthRecord> recent = context.recentGrowthRecords();
            if (recent.isEmpty()) {
                return List.of(new DetectedPattern(
                        "NO_GROWTH_RECORD",
                        "LOW",
                        "Chưa có dữ liệu tăng trưởng",
                        "Nên nhắc ba mẹ nhập cân nặng/chiều cao để cá nhân hóa nhận xét tốt hơn."
                ));
            }

            List<DetectedPattern> patterns = new ArrayList<>();
            GrowthRecord latest = recent.get(0);
            if (isAbnormalGrowthStatus(latest)) {
                patterns.add(new DetectedPattern(
                        "GROWTH_STATUS_ATTENTION",
                        "HIGH",
                        "Chỉ số tăng trưởng mới nhất cần chú ý",
                        "Cân nặng: " + text(latest.getWeightStatus()) + ", chiều cao: " + text(latest.getHeightStatus()) + ". AI cần diễn giải theo hướng theo dõi và hỏi bác sĩ nếu xu hướng kéo dài."
                ));
            }
            if (recent.size() < 2) return patterns;

            GrowthRecord previous = recent.get(1);
            BigDecimal latestWeight = latest.getWeightKg();
            BigDecimal previousWeight = previous.getWeightKg();
            if (latestWeight == null || previousWeight == null) return patterns;

            double delta = latestWeight.subtract(previousWeight).doubleValue();
            if (delta < -0.2) {
                patterns.add(new DetectedPattern(
                        "WEIGHT_TREND_DOWN",
                        "HIGH",
                        "Cân nặng giảm so với lần đo trước",
                        "Cân nặng giảm khoảng " + roundOne(Math.abs(delta)) + " kg; cần kiểm tra sai số đo, bệnh gần đây, lượng ăn/bú và cân lại đúng cách."
                ));
            } else if (delta > 1.5) {
                patterns.add(new DetectedPattern(
                        "WEIGHT_TREND_UP_FAST",
                        "MEDIUM",
                        "Cân nặng tăng nhanh so với lần đo trước",
                        "Cân nặng tăng khoảng " + roundOne(delta) + " kg; nên xem lại khoảng cách giữa hai lần đo và khẩu phần."
                ));
            }
            return patterns;
        }

        private boolean isAbnormalGrowthStatus(GrowthRecord record) {
            return List.of("SEVERELY_UNDERWEIGHT", "UNDERWEIGHT", "OVERWEIGHT").contains(record.getWeightStatus())
                    || List.of("SHORT", "TALL").contains(record.getHeightStatus());
        }
    }

    private static class VaccinationRule implements BabyAnalyticsRule {
        @Override
        public List<DetectedPattern> evaluate(BabyAnalyticsContext context) {
            List<DetectedPattern> patterns = new ArrayList<>();
            if (!context.overdueVaccinations().isEmpty()) {
                patterns.add(new DetectedPattern(
                        "VACCINE_OVERDUE",
                        "HIGH",
                        "Có mũi tiêm quá hạn/chưa hoàn tất",
                        "Mũi cần chú ý: " + context.overdueVaccinations().stream().limit(3).map(this::vaccineLabel).collect(Collectors.joining("; ")) + "."
                ));
            }
            if (!context.upcomingVaccinations().isEmpty()) {
                patterns.add(new DetectedPattern(
                        "VACCINE_DUE_SOON",
                        "MEDIUM",
                        "Có mũi tiêm trong 7 ngày tới",
                        "Mũi sắp tới: " + context.upcomingVaccinations().stream().limit(3).map(this::vaccineLabel).collect(Collectors.joining("; ")) + "."
                ));
            }
            return patterns;
        }

        private String vaccineLabel(VaccinationRecord record) {
            return record.getVaccineName() + " mũi " + record.getDoseNumber() + " ngày " + record.getScheduledDate();
        }
    }

    private static String text(Object value) {
        return Objects.toString(value, "").trim();
    }

    private static double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
