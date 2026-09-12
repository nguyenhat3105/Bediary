package com.bediary.service;

import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AiOutputSafetyFilter {

    private static final String FALLBACK_ANSWER = "Mình không nên đưa hướng dẫn liều dùng thuốc trực tiếp trong trường hợp này. Về thuốc, hoạt chất hoặc liều dùng cụ thể, ba mẹ hãy hỏi bác sĩ/dược sĩ hoặc cơ sở y tế đang theo dõi bé nhé. Nếu bé có dấu hiệu bất thường như sốt cao, khó thở, li bì, bỏ bú, nôn nhiều, tiêu chảy nhiều hoặc mất nước, hãy liên hệ cơ sở y tế ngay.";
    private static final String SAFETY_NOTE = "Câu trả lời đã được lọc an toàn vì có nội dung giống hướng dẫn liều thuốc.";

    private final List<String> blockedMedications;
    private final Pattern dosePattern;

    public AiOutputSafetyFilter(Environment environment) {
        this.blockedMedications = readList(environment, "bediary.ai.safety.blocked-medications");
        List<String> units = readList(environment, "bediary.ai.safety.dose-units");
        String unitPattern = units.isEmpty()
                ? "mg|ml|mcg|g|giot|vien|goi|lan/ngay|lan moi ngay|mg/kg"
                : units.stream()
                .map(Pattern::quote)
                .reduce((a, b) -> a + "|" + b)
                .orElse("");
        this.dosePattern = Pattern.compile("\\b\\d+(?:[.,]\\d+)?\\s*(?:" + unitPattern + ")\\b", Pattern.CASE_INSENSITIVE);
    }

    public FilteredAnswer filter(String answer) {
        if (!StringUtils.hasText(answer) || blockedMedications.isEmpty()) {
            return new FilteredAnswer(answer, null, false);
        }

        String normalized = normalize(answer);
        if (!dosePattern.matcher(normalized).find()) {
            return new FilteredAnswer(answer, null, false);
        }

        boolean mentionsBlockedMedication = blockedMedications.stream()
                .map(this::normalize)
                .filter(StringUtils::hasText)
                .anyMatch(medication -> mentionsMedicationDose(normalized, medication));

        if (!mentionsBlockedMedication) {
            return new FilteredAnswer(answer, null, false);
        }
        return new FilteredAnswer(FALLBACK_ANSWER, SAFETY_NOTE, true);
    }

    private boolean mentionsMedicationDose(String text, String medication) {
        String med = Pattern.quote(medication);
        Pattern medicationThenDose = Pattern.compile("\\b" + med + "\\b[\\s\\S]{0,100}" + dosePattern.pattern(), Pattern.CASE_INSENSITIVE);
        Pattern doseThenMedication = Pattern.compile(dosePattern.pattern() + "[\\s\\S]{0,100}\\b" + med + "\\b", Pattern.CASE_INSENSITIVE);
        return medicationThenDose.matcher(text).find() || doseThenMedication.matcher(text).find();
    }

    private List<String> readList(Environment environment, String key) {
        return Binder.get(environment)
                .bind(key, Bindable.listOf(String.class))
                .orElse(List.of())
                .stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT);
    }

    public record FilteredAnswer(
            String answer,
            String safetyNote,
            boolean filtered
    ) {}
}
