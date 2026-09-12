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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiKnowledgeService {
    private static final Logger log = LoggerFactory.getLogger(AiKnowledgeService.class);
    private static final String MASTER_CSV = "ai/knowledge/du_lieu_app_cham_soc_tre_MASTER_v26_CLINICALLY_REVIEWED.csv";
    private static final int MAX_RESULTS = 6;
    private static final int MAX_CONTEXT_CHARS = 6500;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern EXPLICIT_MONTH_AGE = Pattern.compile("(\\d{1,2})\\s*(thang|month)");
    private static final Pattern EXPLICIT_YEAR_AGE = Pattern.compile("(\\d{1,2})\\s*(tuoi|year)");
    private static final Set<String> STOP_WORDS = Set.of(
            "cho", "cua", "voi", "nay", "kia", "thi", "la", "va", "ve", "cac", "nhung",
            "duoc", "khong", "be", "tre", "em", "con", "ba", "me", "bo", "hoi", "dap",
            "hom", "nhieu", "bao", "thang", "tuoi", "can", "nen", "biet", "lam", "gi", "the", "nao", "user"
    );

    private volatile List<KnowledgeEntry> entries = List.of();
    private volatile java.util.Map<String, String> sources = java.util.Map.of();

    @PostConstruct
    public void load() {
        try {
            entries = loadCsv();
            log.info("Loaded {} AI knowledge entries from {}", entries.size(), MASTER_CSV);
        } catch (Exception e) {
            log.warn("Could not load AI knowledge file {}: {}", MASTER_CSV, e.getMessage());
            entries = List.of();
        }
        try (var input = new ClassPathResource("ai/knowledge/sources.json").getInputStream()) {
            var catalog = new com.fasterxml.jackson.databind.ObjectMapper().readTree(input);
            java.util.Map<String, String> loaded = new java.util.HashMap<>();
            for (var source : catalog) loaded.put(source.path("id").asText(),
                    source.path("publisher").asText() + ": " + source.path("title").asText() + " — "
                            + source.path("url").asText() + " (" + source.path("reviewStatus").asText() + ")");
            sources = java.util.Map.copyOf(loaded);
        } catch (Exception e) {
            log.warn("Knowledge source metadata unavailable: {}", e.getClass().getSimpleName());
        }
    }

    public String retrieveRelevantContext(Family family, String question, String appContext) {
        if (entries.isEmpty()) return "";

        String normalizedQuestion = normalize(question);
        int requestedAgeMonths = explicitAgeMonths(normalizedQuestion);
        final int babyAgeMonths = requestedAgeMonths >= 0 ? requestedAgeMonths : ageInMonths(family);
        // Page context must not drown out the user's actual topic.
        String query = question == null ? "" : question;
        Set<String> queryTokens = tokenize(query);
        if (queryTokens.isEmpty() && normalizedQuestion.matches(".*(can biet|nen biet|cham soc|phat trien).*")) {
            queryTokens = tokenize("dinh duong ngu van dong giao tiep an toan");
        }
        if (queryTokens.isEmpty()) return "";
        final Set<String> searchTokens = queryTokens;

        List<ScoredEntry> ranked = entries.stream()
                .map(entry -> new ScoredEntry(entry, score(entry, searchTokens, babyAgeMonths)))
                .filter(item -> item.score() > 0)
                .sorted(Comparator.comparingInt(ScoredEntry::score).reversed())
                .limit(MAX_RESULTS)
                .toList();

        if (ranked.isEmpty()) return "";

        StringBuilder builder = new StringBuilder();
        builder.append("Tài liệu tham khảo nội bộ theo chủ đề và tuổi; mã nguồn dùng để đối chiếu, không tự bịa URL:\n");
        for (ScoredEntry item : ranked) {
            KnowledgeEntry entry = item.entry();
            int entryStart = builder.length();
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
            builder.append("  Nguồn: ").append(entry.sourceId()).append(" / ").append(entry.sourceSection()).append("\n");
            if (sources.containsKey(entry.sourceId())) builder.append("  ").append(sources.get(entry.sourceId())).append("\n");
            if (builder.length() > MAX_CONTEXT_CHARS) {
                builder.setLength(entryStart);
                break;
            }
        }
        return builder.toString();
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
        if (babyAgeMonths >= 0 && !isAgeRelevant(entry, babyAgeMonths)) return 0;
        int score = 0;

        for (String token : queryTokens) {
            if (matchesToken(entry.content(), token)) score += 1;
            if (matchesToken(entry.title(), token)) score += 8;
            if (matchesToken(entry.keywords(), token)) score += 6;
            if (matchesToken(entry.questions(), token)) score += 4;
            if (matchesToken(entry.category(), token) || matchesToken(entry.topic(), token)) score += 4;
        }

        if (score > 0 && babyAgeMonths >= 0) score += 2;
        return score;
    }

    private boolean matchesToken(String text, String token) {
        return Pattern.compile("(?<![a-z0-9])" + Pattern.quote(token) + "(?![a-z0-9])")
                .matcher(normalize(text)).find();
    }

    private boolean isAgeRelevant(KnowledgeEntry entry, int babyAgeMonths) {
        Integer min = entry.ageMinMonths();
        Integer max = entry.ageMaxMonths();
        if (min == null && max == null) return true;
        int lower = min == null ? 0 : min;
        int upper = max == null ? 240 : max;
        return babyAgeMonths >= lower && babyAgeMonths <= upper;
    }

    private int explicitAgeMonths(String normalizedQuestion) {
        if (!StringUtils.hasText(normalizedQuestion)) return -1;
        Matcher matcher = Pattern.compile("\\b(\\d{1,2})\\s*(thang|months?|tuoi|years?)(?:\\s+(\\d{1,2})\\s*(?:thang|months?))?\\b").matcher(normalizedQuestion);
        int age = -1;
        while (matcher.find()) {
            int value = Integer.parseInt(matcher.group(1));
            boolean years = matcher.group(2).equals("tuoi") || matcher.group(2).startsWith("year");
            age = years ? value * 12 : value;
            if (years && matcher.group(3) != null) age += Integer.parseInt(matcher.group(3));
        }
        return age;
    }

    private int parsePositiveInt(String value, int fallback) {
        try {
            int parsed = Integer.parseInt(value);
            return parsed >= 0 ? parsed : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private int ageInMonths(Family family) {
        LocalDate dob = family == null ? null : family.getBabyDob();
        if (dob == null) return -1;
        Period age = Period.between(dob, LocalDate.now());
        return Math.max(0, age.getYears() * 12 + age.getMonths());
    }

    private Set<String> tokenize(String text) {
        String normalized = normalize(text);
        Set<String> result = new LinkedHashSet<>();
        for (String token : normalized.split("[^a-z0-9]+")) {
            if (token.length() >= 2 && !token.matches("\\d+") && !STOP_WORDS.contains(token)) {
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
