package com.bediary.service;

import com.bediary.dto.AiChatRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AiIntentService {
    private static final double ROUTE_THRESHOLD = 0.5;

    public AiIntent detect(String question) {
        return primaryIntent(score(normalize(question)));
    }

    public String instruction(AiIntent intent) {
        return switch (intent) {
            case KNOWLEDGE -> "Route Knowledge AI: ưu tiên trả lời kiến thức chăm sóc theo tuổi từ Knowledge DB. Không dùng tên, tuổi thật, giới tính thật hoặc dữ liệu app của bé nếu người dùng chỉ hỏi kiến thức chung.";
            case TRACKING -> "Route Tracking AI: ưu tiên trả lời bằng dữ liệu database/nhật ký thực tế của bé. Cần nêu rõ app ghi nhận gì, số lần/tổng ml/tổng phút, và nói rõ nếu dữ liệu có thể chưa nhập đủ.";
            case INSIGHT -> "Route Insight AI: ưu tiên Baby Analytics/Rule Engine. Giải thích các pattern, xu hướng và thay đổi đã phát hiện; không chẩn đoán bệnh.";
            case HEALTH_GUIDANCE -> "Route Health Guidance AI: ưu tiên triệu chứng/câu hỏi sức khỏe, kết hợp Analytics + Knowledge + Safety Rules. Trả lời việc cần làm ngay, dấu hiệu đỏ và khi cần đi khám; không kê thuốc/liều.";
        };
    }

    public AiRoute route(String question) {
        return route(question, List.of());
    }

    public String retrievalQuestion(String question, List<AiChatRequest.ChatMessage> history) {
        return isFollowUp(question) ? questionWithHistory(question, history) : question;
    }

    public AiRoute route(String question, List<AiChatRequest.ChatMessage> history) {
        String currentQuestion = normalize(question);
        Map<AiIntent, Double> scores = score(currentQuestion);
        if (isFollowUp(question)) {
            scores = score(normalize(questionWithHistory(question, history)));
        }
        Set<AiIntent> intents = selectedIntents(scores);
        AiIntent intent = primaryIntent(scores);
        return new AiRoute(
                intent,
                labelFor(intents, intent),
                intents,
                scores,
                intents.contains(AiIntent.KNOWLEDGE) || intents.contains(AiIntent.INSIGHT) || intents.contains(AiIntent.HEALTH_GUIDANCE),
                intents.contains(AiIntent.TRACKING) || intents.contains(AiIntent.INSIGHT) || intents.contains(AiIntent.HEALTH_GUIDANCE)
                        || containsAny(currentQuestion, "con em", "con minh", "be nha em", "be nha minh", "be cua toi", "be cua minh"),
                intents.contains(AiIntent.INSIGHT) || intents.contains(AiIntent.HEALTH_GUIDANCE),
                intents.contains(AiIntent.HEALTH_GUIDANCE)
        );
    }

    public record AiRoute(
            AiIntent intent,
            String label,
            Set<AiIntent> intents,
            Map<AiIntent, Double> scores,
            boolean includeKnowledge,
            boolean includeBabyData,
            boolean includeAnalytics,
            boolean includeSafetyRules
    ) {}

    private Map<AiIntent, Double> score(String q) {
        Map<AiIntent, Double> scores = new EnumMap<>(AiIntent.class);
        scores.put(AiIntent.KNOWLEDGE, 0.0);
        scores.put(AiIntent.TRACKING, 0.0);
        scores.put(AiIntent.INSIGHT, 0.0);
        scores.put(AiIntent.HEALTH_GUIDANCE, 0.0);

        if (containsAny(q, "can biet", "nen biet", "bao nhieu thang", "may thang", "an dam", "ngu bao nhieu", "phat trien", "tummy time")
                || q.matches(".*\\b\\d+\\s*(thang|tuoi)\\b.*")) {
            scores.put(AiIntent.KNOWLEDGE, 0.6);
        }
        String symptoms = q.replaceAll("\\bbat dau\\b", " ")
                .replaceAll("\\b(?:khong|chua|het)\\s+(?:bi\\s+)?(?:sot|ho|non|kho tho|bo bu|tieu chay)\\b", " ");
        if (containsAny(symptoms,
                "hom nay", "hom qua", "hom kia", "tuan nay", "tuan truoc", "7 ngay", "may lan", "luc nao", "lan nao", "da an", "da bu",
                "tong ml", "ngu may", "ngu bao lau", "di tieu", "di ngoai", "ta",
                "lich su", "nhat ky", "tracking", "log") || q.matches(".*\\b\\d{4}-\\d{2}-\\d{2}\\b.*")) {
            scores.put(AiIntent.TRACKING, 0.7);
        }
        if (containsAny(q,
                "dao nay", "gan day", "xu huong", "thay doi", "bat thuong", "khac moi ngay",
                "giam", "tang", "kem hon", "tot hon", "on khong", "nhan xet", "phan tich",
                "can nang", "chieu cao", "tang truong", "z score", "percentile", "who",
                "tiem", "vac xin", "vaccine", "mui tiem", "chung ngua")) {
            scores.put(AiIntent.INSIGHT, 0.7);
        }
        if (containsAny(symptoms,
                "sot", "nong", "ham ham", "am nguoi", "than nhiet", "kho khe", "nghet mui", "kho ngu",
                "bieng an", "chan an", "bo an", "an it", "bu kem", "bo bu", "bu it",
                "met", "li bi", "quay", "khoc", "non", "tieu chay", "di ngoai long",
                "kho tho", "ho", "benh", "dau", "di ung", "phat ban",
                "can di kham", "di kham", "hoi bac si", "nguy hiem", "co sao khong",
                "thuoc", "don thuoc", "chan doan", "xet nghiem", "suc khoe")) {
            scores.put(AiIntent.HEALTH_GUIDANCE, 0.8);
        }

        if (scores.values().stream().allMatch(score -> score <= 0)) {
            scores.put(AiIntent.KNOWLEDGE, 0.6);
        }
        if (containsAny(q, "thuc don", "lap lich", "ke hoach", "goi y mon")) scores.put(AiIntent.KNOWLEDGE, 0.75);
        return scores;
    }

    private Set<AiIntent> selectedIntents(Map<AiIntent, Double> scores) {
        Set<AiIntent> intents = new LinkedHashSet<>();
        scores.entrySet().stream()
                .sorted(Map.Entry.<AiIntent, Double>comparingByValue(Comparator.reverseOrder()))
                .filter(entry -> entry.getValue() > ROUTE_THRESHOLD)
                .map(Map.Entry::getKey)
                .forEach(intents::add);
        if (intents.isEmpty()) intents.add(primaryIntent(scores));
        return intents;
    }

    private AiIntent primaryIntent(Map<AiIntent, Double> scores) {
        return scores.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(AiIntent.KNOWLEDGE);
    }

    private String labelFor(Set<AiIntent> intents, AiIntent primary) {
        if (intents.size() <= 1) {
            return singleLabel(primary);
        }
        return "Hybrid Question: " + intents.stream()
                .map(this::singleLabel)
                .reduce((a, b) -> a + " + " + b)
                .orElse(singleLabel(primary));
    }

    private String singleLabel(AiIntent intent) {
        return switch (intent) {
            case KNOWLEDGE -> "Knowledge Question";
            case TRACKING -> "Tracking Question";
            case INSIGHT -> "Insight Question";
            case HEALTH_GUIDANCE -> "Health Concern";
        };
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (Pattern.compile("(?<![a-z0-9])" + Pattern.quote(needle) + "(?![a-z0-9])").matcher(text).find()) return true;
        }
        return false;
    }

    public boolean isFollowUp(String value) {
        String question = normalize(value);
        if (containsAny(question, "chuyen chu de", "cau hoi khac", "thuc don", "lap lich", "can biet", "nhat ky", "hom qua")) return false;
        boolean followUp = containsAny(question,
                "vay", "the", "nhu vay", "vay thi", "the thi", "co can", "can lam gi",
                "xu ly gi", "lam sao", "tiep theo", "nhu tren", "truong hop nay", "co nguy hiem khong"
        );
        return followUp || containsAny(question, "van bu", "khong sot", "het sot", "tu toi", "tu sang", "hai ngay", "3 ngay")
                || question.matches("(?:be )?\\d+(?:[.,]\\d+)?\\s*(thang|tuoi|do|ngay|gio).*" );
    }

    private String questionWithHistory(String question, List<AiChatRequest.ChatMessage> history) {
        if (history == null || history.isEmpty()) return question;
        StringBuilder builder = new StringBuilder();
        history.stream()
                .filter(message -> "user".equals(message.role()))
                .skip(Math.max(0, history.stream().filter(message -> "user".equals(message.role())).count() - 3))
                .forEach(message -> builder
                        .append(message.role())
                        .append(": ")
                        .append(message.text())
                        .append("\n"));
        builder.append("user: ").append(question);
        return builder.toString();
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
