package com.bediary.util;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.TreeMap;

/**
 * Simplified WHO growth standard utility for babies aged 0–60 months.
 *
 * Percentile thresholds used (approximate):
 *   index 0 → 3rd  percentile (severely underweight / short cutoff)
 *   index 1 → 15th percentile (underweight cutoff)
 *   index 2 → 85th percentile (overweight cutoff)
 *   index 3 → 97th percentile (obese / very overweight cutoff)
 *
 * Female values are approximated as MALE × 0.95 for MVP simplicity.
 */
@Component
public class WhoGrowthUtil {

    // ── Weight-for-age thresholds (kg) for MALE ────────────────────────────
    // key = age in months, value = {p3, p15, p85, p97}
    private static final TreeMap<Integer, double[]> MALE_WEIGHT = new TreeMap<>();
    private static final TreeMap<Integer, double[]> MALE_HEIGHT = new TreeMap<>();

    static {
        // Weight (kg): {p3, p15, p85, p97}
        MALE_WEIGHT.put(0,  new double[]{1.9,  2.5,  4.3,  5.0});
        MALE_WEIGHT.put(3,  new double[]{4.4,  5.0,  7.2,  8.0});
        MALE_WEIGHT.put(6,  new double[]{5.7,  6.4,  8.8,  9.7});
        MALE_WEIGHT.put(9,  new double[]{7.1,  7.9, 10.2, 11.0});
        MALE_WEIGHT.put(12, new double[]{7.7,  8.6, 11.5, 12.6});
        MALE_WEIGHT.put(18, new double[]{8.8,  9.8, 13.2, 14.3});
        MALE_WEIGHT.put(24, new double[]{9.7, 10.8, 14.3, 15.7});
        MALE_WEIGHT.put(36, new double[]{11.4, 12.7, 16.8, 18.3});
        MALE_WEIGHT.put(48, new double[]{13.0, 14.5, 19.4, 21.2});
        MALE_WEIGHT.put(60, new double[]{14.5, 16.2, 22.0, 24.2});

        // Height (cm): {p3, p15, p85, p97}
        MALE_HEIGHT.put(0,  new double[]{44.2, 46.1, 52.9, 55.6});
        MALE_HEIGHT.put(3,  new double[]{55.3, 57.5, 64.1, 66.6});
        MALE_HEIGHT.put(6,  new double[]{61.2, 63.6, 70.5, 73.2});
        MALE_HEIGHT.put(9,  new double[]{66.2, 68.7, 76.3, 79.1});
        MALE_HEIGHT.put(12, new double[]{69.6, 72.2, 80.2, 83.2});
        MALE_HEIGHT.put(18, new double[]{76.0, 78.7, 87.7, 90.7});
        MALE_HEIGHT.put(24, new double[]{81.7, 84.6, 93.9, 97.3});
        MALE_HEIGHT.put(36, new double[]{89.7, 92.9, 103.1, 106.9});
        MALE_HEIGHT.put(48, new double[]{96.7, 100.3, 111.5, 115.7});
        MALE_HEIGHT.put(60, new double[]{103.2, 107.2, 119.2, 123.9});
    }

    private static final double FEMALE_FACTOR = 0.95;

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Assesses weight-for-age.
     *
     * @param ageDays   Baby age in days
     * @param weightKg  Weight measurement
     * @param gender    "MALE" or "FEMALE" (case-insensitive)
     * @return One of: SEVERELY_UNDERWEIGHT, UNDERWEIGHT, NORMAL, OVERWEIGHT
     */
    public String assessWeight(int ageDays, BigDecimal weightKg, String gender) {
        if (weightKg == null) return "NORMAL";
        double w = weightKg.doubleValue();
        double[] thresholds = interpolateThresholds(MALE_WEIGHT, ageDays, gender);

        if (w < thresholds[0]) return "SEVERELY_UNDERWEIGHT";
        if (w < thresholds[1]) return "UNDERWEIGHT";
        if (w > thresholds[3]) return "OVERWEIGHT";
        return "NORMAL";
    }

    /**
     * Assesses height-for-age.
     *
     * @param ageDays  Baby age in days
     * @param heightCm Height measurement
     * @param gender   "MALE" or "FEMALE" (case-insensitive)
     * @return One of: SHORT, NORMAL, TALL
     */
    public String assessHeight(int ageDays, BigDecimal heightCm, String gender) {
        if (heightCm == null) return "NORMAL";
        double h = heightCm.doubleValue();
        double[] thresholds = interpolateThresholds(MALE_HEIGHT, ageDays, gender);

        if (h < thresholds[0]) return "SHORT";
        if (h > thresholds[3]) return "TALL";
        return "NORMAL";
    }

    /**
     * Returns a friendly Vietnamese summary string with emoji.
     *
     * @param weightStatus Result from {@link #assessWeight}
     * @param heightStatus Result from {@link #assessHeight}
     * @return Localised status text
     */
    public String getStatusText(String weightStatus, String heightStatus) {
        String ws = weightStatus != null ? weightStatus : "NORMAL";
        String hs = heightStatus != null ? heightStatus : "NORMAL";

        String weightText = switch (ws) {
            case "SEVERELY_UNDERWEIGHT" -> "⚠️ Suy dinh dưỡng nặng";
            case "UNDERWEIGHT"          -> "📉 Thiếu cân";
            case "OVERWEIGHT"           -> "📈 Thừa cân";
            default                     -> "✅ Cân nặng bình thường";
        };

        String heightText = switch (hs) {
            case "SHORT" -> "📏 Chiều cao thấp hơn chuẩn";
            case "TALL"  -> "🌟 Chiều cao vượt trội";
            default      -> "✅ Chiều cao bình thường";
        };

        if (ws.equals("NORMAL") && hs.equals("NORMAL")) {
            return "🎉 Bé phát triển tốt! Cân nặng và chiều cao đều trong chuẩn WHO.";
        }
        return weightText + " | " + heightText;
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Linearly interpolates WHO thresholds for the given age in days.
     * Falls back to nearest defined age group if out of range.
     */
    private double[] interpolateThresholds(TreeMap<Integer, double[]> table,
                                            int ageDays, String gender) {
        int ageMonths = ageDays / 30;

        Integer lo = table.floorKey(ageMonths);
        Integer hi = table.ceilingKey(ageMonths);

        double[] raw;
        if (lo == null) {
            raw = table.firstEntry().getValue();
        } else if (hi == null || lo.equals(hi)) {
            raw = table.get(lo);
        } else {
            // Linear interpolation between lo and hi month groups
            double[] loVal = table.get(lo);
            double[] hiVal = table.get(hi);
            double t = (double)(ageMonths - lo) / (hi - lo);
            raw = new double[4];
            for (int i = 0; i < 4; i++) {
                raw[i] = loVal[i] + t * (hiVal[i] - loVal[i]);
            }
        }

        boolean isFemale = "FEMALE".equalsIgnoreCase(gender);
        if (isFemale) {
            double[] adjusted = new double[4];
            for (int i = 0; i < 4; i++) {
                adjusted[i] = raw[i] * FEMALE_FACTOR;
            }
            return adjusted;
        }
        return raw;
    }
}
