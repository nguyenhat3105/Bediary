package com.bediary.service;

import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiIntentServiceEvalTest {

    private final AiIntentService service = new AiIntentService();

    @Test
    void routerMatchesBaselineEvalSet() throws Exception {
        List<EvalCase> cases = loadCases();
        List<String> failures = new ArrayList<>();

        for (EvalCase item : cases) {
            AiIntent actual = service.route(item.question(), List.of()).intent();
            if (actual != item.expected()) {
                failures.add("\"" + item.question() + "\" expected " + item.expected() + " but got " + actual);
            }
        }

        assertEquals(List.of(), failures);
    }

    @Test
    void routerUsesRecentHistoryForFollowUpQuestions() {
        var history = List.of(
                new com.bediary.dto.AiChatRequest.ChatMessage("user", "Bé đang nóng và biếng ăn từ chiều nay"),
                new com.bediary.dto.AiChatRequest.ChatMessage("assistant", "Ba mẹ nên đo nhiệt độ và theo dõi lượng bú.")
        );

        AiIntent actual = service.route("Vậy có cần xử lý gì ngay không?", history).intent();

        assertEquals(AiIntent.HEALTH_GUIDANCE, actual);
    }

    @Test
    void routerDoesNotLetHistoryOverrideStandaloneKnowledgeQuestion() {
        var history = List.of(
                new com.bediary.dto.AiChatRequest.ChatMessage("user", "Bé đang nóng và biếng ăn từ chiều nay"),
                new com.bediary.dto.AiChatRequest.ChatMessage("assistant", "Ba mẹ nên đo nhiệt độ và theo dõi lượng bú.")
        );

        AiIntentService.AiRoute route = service.route("Bé 6 tháng cần biết những gì?", history);

        assertEquals(AiIntent.KNOWLEDGE, route.intent());
        assertEquals(List.of(AiIntent.KNOWLEDGE), new ArrayList<>(route.intents()));
    }

    private List<EvalCase> loadCases() throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                getClass().getResourceAsStream("/ai-router-eval.csv"),
                StandardCharsets.UTF_8
        ))) {
            return reader.lines()
                    .skip(1)
                    .filter(line -> !line.isBlank())
                    .map(line -> {
                        int comma = line.lastIndexOf(',');
                        String question = line.substring(0, comma);
                        AiIntent expected = AiIntent.valueOf(line.substring(comma + 1));
                        return new EvalCase(question, expected);
                    })
                    .toList();
        }
    }

    private record EvalCase(String question, AiIntent expected) {}
}
