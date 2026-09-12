package com.bediary.service;

import com.bediary.dto.AiChatRequest;
import com.bediary.entity.Family;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AiRelevanceTest {
    private final AiIntentService router = new AiIntentService();

    @Test void matchesWholeWordsAndHandlesNegation() {
        assertEquals(AiIntent.TRACKING, router.route("Hôm nay bé bú bao nhiêu ml?").intent());
        assertEquals(AiIntent.KNOWLEDGE, router.route("Bé 6 tháng ngủ bao nhiêu là đủ?").intent());
        assertEquals(AiIntent.HEALTH_GUIDANCE, router.route("Hôm nay bé ho nhiều và khó ngủ").intent());
        assertNotEquals(AiIntent.HEALTH_GUIDANCE, router.route("Bé không sốt, không ho, vẫn bú tốt").intent());
        assertEquals(AiIntent.HEALTH_GUIDANCE, router.route("Bé không sốt nhưng khó thở").intent());
    }

    @Test void usesUserContextForFollowUpWithoutAssistantInventedSymptoms() {
        var history = List.of(new AiChatRequest.ChatMessage("user", "Bé ho nhiều và khó ngủ"),
                new AiChatRequest.ChatMessage("assistant", "Nếu có sốt thì cần kiểm tra."));
        assertEquals(AiIntent.HEALTH_GUIDANCE, router.route("Bé 6 tháng, vẫn bú tốt", history).intent());
        assertFalse(router.retrievalQuestion("Vậy cần làm gì?", history).contains("Nếu có sốt"));
        assertEquals(AiIntent.KNOWLEDGE, router.route("Gợi ý thực đơn ăn dặm", history).intent());
    }

    @Test void retrievalKeepsCoughAndRejectsUnrelatedAgeOnlyMatches() {
        var knowledge = new AiKnowledgeService();
        knowledge.load();
        Family family = new Family();
        family.setBabyDob(LocalDate.now().minusMonths(6));
        String result = knowledge.retrieveRelevantContext(family, "ho", "cân nặng tăng trưởng vaccine");
        assertTrue(result.contains("ho"));
        assertTrue(result.contains("Nguồn:"));
        assertTrue(result.contains("KB0574") || result.contains("KB1470"), result);
        assertEquals("", knowledge.retrieveRelevantContext(family, "zzzzxxxx", null));
        assertTrue(result.length() <= 6500);
    }

    @Test void retrievesSleepSeparatelyAndPreservesSourceBoundaries() {
        var knowledge = new AiKnowledgeService();
        knowledge.load();
        String result = knowledge.retrieveRelevantContext(null, "Bé 18 tháng ngủ", null);
        assertFalse(result.isBlank());
        assertTrue(result.contains("Nguồn:"));
        assertFalse(result.contains("đã rút gọn"));
    }

    @Test void supplementaryCareIsTopicSpecificAndSourced() {
        String cough = AiHealthKnowledge.forQuestion("Bé ho nhiều và khó ngủ");
        assertTrue(cough.contains("CARE-RESP"));
        assertTrue(cough.contains("CARE-SLEEP"));
        assertFalse(cough.contains("CARE-FEED"));
        assertTrue(cough.contains("https://www.nhs.uk/conditions/bronchiolitis/"));
        assertTrue(AiHealthKnowledge.forQuestion("Bé sốt lúc mọc răng").contains("Không quy sốt"));
    }

    @Test void personalKnowledgeUsesProfileWithoutPretendingItIsTracking() {
        var route = router.route("Con em nên ăn gì?");
        assertEquals(AiIntent.KNOWLEDGE, route.intent());
        assertTrue(route.includeBabyData());
        assertTrue(route.includeKnowledge());
    }

    @Test void ageParsingUsesLatestCorrectionAndCombinedYearsMonths() {
        var knowledge = new AiKnowledgeService();
        assertEquals(18, (Integer) ReflectionTestUtils.invokeMethod(knowledge, "explicitAgeMonths", "be 1 tuoi 6 thang"));
        assertEquals(9, (Integer) ReflectionTestUtils.invokeMethod(knowledge, "explicitAgeMonths", "be 6 thang\nnham, be 9 thang"));
    }
}
