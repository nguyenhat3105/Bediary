package com.bediary.service;

import com.bediary.entity.Family;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AiKnowledgeService {
    private static final Logger log = LoggerFactory.getLogger(AiKnowledgeService.class);
    private static final String MASTER_CSV = "ai/knowledge/du_lieu_app_cham_soc_tre_MASTER_v26_CLINICALLY_REVIEWED.csv";
    private static final int MAX_RESULTS = 6;
    private static final int MAX_CONTEXT_CHARS = 6500;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Set<String> STOP_WORDS = Set.of(
            "cho", "cua", "voi", "nay", "kia", "thi", "la", "va", "ve", "cac", "nhung",
            "duoc", "khong", "be", "tre", "em", "con", "ba", "me", "bo", "hoi", "dap"
    );

    private volatile List<KnowledgeEntry> entries = List.of();

    @PostConstruct
    public void load() {
        try {
            entries = loadCsv();
            log.info("Loaded {} AI knowledge entries from {}", entries.size(), MASTER_CSV);
        } catch (Exception e) {
            log.warn("Could not load AI knowledge file {}: {}", MASTER_CSV, e.getMessage());
            entries = List.of();
        }
    }

    public String retrieveRelevantContext(Family family, String question, String appContext) {
        if (entries.isEmpty()) return "";

        int babyAgeMonths = ageInMonths(family);
        String query = String.join(" ",
                question == null ? "" : question,
                appContext == null ? "" : appContext,
                family.getBabyGender() != null ? family.getBabyGender().name() : "",
                "thang tuoi " + babyAgeMonths
        );
        Set<String> queryTokens = tokenize(query);
        if (queryTokens.isEmpty()) return "";

        List<ScoredEntry> ranked = entries.stream()
                .map(entry -> new ScoredEntry(entry, score(entry, queryTokens, babyAgeMonths)))
                .filter(item -> item.score() > 0)
                .sorted(Comparator.comparingInt(ScoredEntry::score).reversed())
                .limit(MAX_RESULTS)
                .toList();

        if (ranked.isEmpty()) return "";

        StringBuilder builder = new StringBuilder();
        builder.append("Tai lieu tham khao clinically reviewed duoc truy xuat theo tuoi/cau hoi:\n");
        for (ScoredEntry item : ranked) {
            KnowledgeEntry entry = item.entry();
            builder.append("- [").append(entry.id()).append("] ")
                    .append(entry.category()).append(" / ").append(entry.topic()).append(": ")
                    .append(entry.title()).append("\n")
                    .append("  Do tuoi ap dung: ").append(formatAgeRange(entry)).append("\n")
                    .append("  Noi dung: ").append(entry.content()).append("\n");
            if (StringUtils.hasText(entry.tips()) && !"[]".equals(entry.tips().trim())) {
                builder.append("  Goi y: ").append(entry.tips()).append("\n");
            }
            if (StringUtils.hasText(entry.avoid()) && !"[]".equals(entry.avoid().trim())) {
                builder.append("  Can tranh: ").append(entry.avoid()).append("\n");
            }
            if (StringUtils.hasText(entry.medicalDisclaimer())) {
                builder.append("  Luu y y khoa: ").append(entry.medicalDisclaimer()).append("\n");
            }
        }
        return limit(builder.toString(), MAX_CONTEXT_CHARS);
    }

    private List<KnowledgeEntry> loadCsv() throws Exception {
        ClassPathResource resource = new ClassPathResource(MASTER_CSV);
        List<KnowledgeEntry> loaded = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) return List.of();

            String line;
            while ((line = reader.readLine()) != null) {
                List<String> cells = parseCsvLine(line);
                if (cells.size() < 14) {
                    continue;
                }
                loaded.add(new KnowledgeEntry(
                        cells.get(0),
                        cells.get(1),
                        cells.get(2),
                        parseInteger(cells.get(3)),
                        parseInteger(cells.get(4)),
                        cells.get(5),
                        cells.get(6),
                        cells.get(7),
                        cells.get(8),
                        cells.get(9),
                        cells.get(10),
                        cells.get(11),
                        cells.get(12),
                        cells.get(13),
                        normalize(String.join(" ", cells))
                ));
            }
        }
        return List.copyOf(loaded);
    }

    private List<String> parseCsvLine(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                cells.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        cells.add(current.toString());
        return cells;
    }

    private int score(KnowledgeEntry entry, Set<String> queryTokens, int babyAgeMonths) {
        int score = 0;
        boolean ageRelevant = isAgeRelevant(entry, babyAgeMonths);
        if (ageRelevant) score += 12;
        else if (entry.ageMinMonths() != null || entry.ageMaxMonths() != null) score -= 4;

        for (String token : queryTokens) {
            if (entry.searchable().contains(token)) score += 2;
            if (normalize(entry.title()).contains(token)) score += 3;
            if (normalize(entry.keywords()).contains(token)) score += 4;
            if (normalize(entry.questions()).contains(token)) score += 3;
            if (normalize(entry.category()).contains(token) || normalize(entry.topic()).contains(token)) score += 2;
        }

        if (entry.searchable().contains("be " + babyAgeMonths + " thang")) score += 6;
        return score;
    }

    private boolean isAgeRelevant(KnowledgeEntry entry, int babyAgeMonths) {
        Integer min = entry.ageMinMonths();
        Integer max = entry.ageMaxMonths();
        if (min == null && max == null) return true;
        int lower = min == null ? 0 : min;
        int upper = max == null ? 240 : max;
        return babyAgeMonths >= lower && babyAgeMonths <= upper;
    }

    private int ageInMonths(Family family) {
        LocalDate dob = family.getBabyDob();
        if (dob == null) return 0;
        Period age = Period.between(dob, LocalDate.now());
        return Math.max(0, age.getYears() * 12 + age.getMonths());
    }

    private Set<String> tokenize(String text) {
        String normalized = normalize(text);
        Set<String> result = new LinkedHashSet<>();
        for (String token : normalized.split("[^a-z0-9]+")) {
            if (token.length() > 2 && !STOP_WORDS.contains(token)) {
                result.add(token);
            }
        }
        return result;
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        normalized = DIACRITICS.matcher(normalized).replaceAll("");
        return normalized.replace('đ', 'd').replace('Đ', 'd');
    }

    private Integer parseInteger(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String formatAgeRange(KnowledgeEntry entry) {
        Integer min = entry.ageMinMonths();
        Integer max = entry.ageMaxMonths();
        if (min == null && max == null) return "mọi độ tuổi";
        if (min != null && max != null && min.equals(max)) return min + " tháng";
        if (min == null) return "đến " + max + " tháng";
        if (max == null) return "từ " + min + " tháng";
        return min + "-" + max + " tháng";
    }

    private String limit(String text, int maxChars) {
        if (text.length() <= maxChars) return text;
        return text.substring(0, maxChars) + "\n...[da rut gon knowledge base theo gioi han prompt]";
    }

    private record ScoredEntry(KnowledgeEntry entry, int score) {}

    private record KnowledgeEntry(
            String id,
            String category,
            String topic,
            Integer ageMinMonths,
            Integer ageMaxMonths,
            String title,
            String content,
            String tips,
            String avoid,
            String keywords,
            String questions,
            String medicalDisclaimer,
            String sourceId,
            String sourceSection,
            String searchable
    ) {}
}
