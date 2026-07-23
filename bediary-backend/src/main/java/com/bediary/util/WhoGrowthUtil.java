package com.bediary.util;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class WhoGrowthUtil {

    public enum Indicator {
        WEIGHT_FOR_AGE,
        LENGTH_HEIGHT_FOR_AGE
    }

    public record Assessment(
            String status,
            double zScore,
            double percentile,
            double median,
            String source
    ) {}

    private record LmsRow(
            Indicator indicator,
            String gender,
            int ageMonths,
            double l,
            double m,
            double s
    ) {}

    private static final String SOURCE = "WHO Child Growth Standards LMS 0-60 months";
    private final Map<String, List<LmsRow>> rowsByKey = new HashMap<>();

    @PostConstruct
    void loadTables() throws Exception {
        ClassPathResource resource = new ClassPathResource("who-growth/who_lms_0_60_months.csv");
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] c = line.split(",");
                LmsRow row = new LmsRow(
                        Indicator.valueOf(c[0]),
                        c[1],
                        Integer.parseInt(c[2]),
                        Double.parseDouble(c[3]),
                        Double.parseDouble(c[4]),
                        Double.parseDouble(c[5])
                );
                rowsByKey.computeIfAbsent(key(row.indicator(), row.gender()), ignored -> new java.util.ArrayList<>()).add(row);
            }
        }
        rowsByKey.values().forEach(list -> list.sort(Comparator.comparingInt(LmsRow::ageMonths)));
    }

    public Assessment assessWeight(int ageDays, BigDecimal weightKg, String gender) {
        if (weightKg == null) return normal();
        double z = zScore(Indicator.WEIGHT_FOR_AGE, ageDays, weightKg.doubleValue(), gender);
        return new Assessment(weightStatus(z), round(z, 2), round(percentile(z), 1),
                round(median(Indicator.WEIGHT_FOR_AGE, ageDays, gender), 2), SOURCE);
    }

    public Assessment assessHeight(int ageDays, BigDecimal heightCm, String gender) {
        if (heightCm == null) return normal();
        double z = zScore(Indicator.LENGTH_HEIGHT_FOR_AGE, ageDays, heightCm.doubleValue(), gender);
        return new Assessment(heightStatus(z), round(z, 2), round(percentile(z), 1),
                round(median(Indicator.LENGTH_HEIGHT_FOR_AGE, ageDays, gender), 1), SOURCE);
    }

    public String getStatusText(String weightStatus, String heightStatus) {
        String ws = weightStatus != null ? weightStatus : "NORMAL";
        String hs = heightStatus != null ? heightStatus : "NORMAL";

        String weightText = switch (ws) {
            case "SEVERELY_UNDERWEIGHT" -> "Suy dinh dưỡng nặng";
            case "UNDERWEIGHT" -> "Thiếu cân";
            case "OVERWEIGHT" -> "Cân nặng cao so với tuổi";
            default -> "Cân nặng trong chuẩn";
        };

        String heightText = switch (hs) {
            case "SHORT" -> "Thấp so với tuổi";
            case "TALL" -> "Chiều cao vượt trội so với tuổi";
            default -> "Chiều cao trong chuẩn";
        };

        if ("NORMAL".equals(ws) && "NORMAL".equals(hs)) {
            return "Bé đang phát triển trong vùng chuẩn WHO theo tuổi và giới tính.";
        }
        return weightText + " | " + heightText;
    }

    private double zScore(Indicator indicator, int ageDays, double measurement, String gender) {
        LmsRow row = rowFor(indicator, ageDays, gender);
        if (row.l() == 0) {
            return Math.log(measurement / row.m()) / row.s();
        }
        return (Math.pow(measurement / row.m(), row.l()) - 1) / (row.l() * row.s());
    }

    private double median(Indicator indicator, int ageDays, String gender) {
        return rowFor(indicator, ageDays, gender).m();
    }

    private LmsRow rowFor(Indicator indicator, int ageDays, String gender) {
        String normalizedGender = "FEMALE".equalsIgnoreCase(gender) ? "FEMALE" : "MALE";
        List<LmsRow> rows = rowsByKey.get(key(indicator, normalizedGender));
        if (rows == null || rows.isEmpty()) {
            throw new IllegalStateException("WHO growth table not loaded for " + indicator + "/" + normalizedGender);
        }
        int ageMonths = Math.max(0, Math.min(60, (int) Math.round(ageDays / 30.4375)));
        return rows.stream()
                .min(Comparator.comparingInt(row -> Math.abs(row.ageMonths() - ageMonths)))
                .orElse(rows.get(0));
    }

    private String weightStatus(double z) {
        if (z < -3) return "SEVERELY_UNDERWEIGHT";
        if (z < -2) return "UNDERWEIGHT";
        if (z > 2) return "OVERWEIGHT";
        return "NORMAL";
    }

    private String heightStatus(double z) {
        if (z < -2) return "SHORT";
        if (z > 2) return "TALL";
        return "NORMAL";
    }

    private Assessment normal() {
        return new Assessment("NORMAL", 0, 50, 0, SOURCE);
    }

    private String key(Indicator indicator, String gender) {
        return indicator.name() + ":" + gender;
    }

    private double percentile(double z) {
        return normalCdf(z) * 100;
    }

    private double normalCdf(double z) {
        return 0.5 * (1.0 + erf(z / Math.sqrt(2.0)));
    }

    private double erf(double x) {
        double sign = Math.signum(x);
        x = Math.abs(x);
        double t = 1.0 / (1.0 + 0.3275911 * x);
        double y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
        return sign * y;
    }

    private double round(double value, int places) {
        double factor = Math.pow(10, places);
        return Math.round(value * factor) / factor;
    }
}
