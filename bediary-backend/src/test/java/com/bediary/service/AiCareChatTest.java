package com.bediary.service;

import com.bediary.dto.AiChatRequest;
import com.bediary.entity.Family;
import com.bediary.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.hamcrest.Matchers.*;

class AiCareChatTest {
    private AiCaptionService service;
    private MockRestServiceServer server;
    private AiContextBuilderService context;
    private Family family;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach void setup() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        var families = mock(FamilyRepository.class);
        family = new Family();
        family.setId(UUID.randomUUID());
        family.setBabyName("TestBaby");
        family.setBabyDob(LocalDate.now().minusMonths(6));
        when(families.findById(family.getId())).thenReturn(Optional.of(family));
        context = mock(AiContextBuilderService.class);
        when(context.buildForQuestion(any(), anyString())).thenReturn("Ngày hôm nay: 3 cữ, 300 ml.");
        var knowledge = new AiKnowledgeService();
        knowledge.load();
        var filter = new AiOutputSafetyFilter(new MockEnvironment().withProperty("bediary.ai.safety.blocked-medications[0]", "paracetamol"));
        service = new AiCaptionService(builder.build(), new GroqKeyPool(""), families, mock(MediaPostRepository.class), mapper, knowledge, context, new AiIntentService(), filter);
        ReflectionTestUtils.setField(service, "groqApiKey", "test");
        ReflectionTestUtils.setField(service, "groqApiUrl", "https://example.test/chat");
        ReflectionTestUtils.setField(service, "chatModel", "test-model");
    }

    private String response(String answer) throws Exception {
        return mapper.writeValueAsString(Map.of("choices", List.of(Map.of("finish_reason", "stop", "message", Map.of("content", answer)))));
    }

    @Test void followUpPreservesRolesAndDoesNotDiscardHealthContextForAgeReply() throws Exception {
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andExpect(jsonPath("$.messages[2].role").value("assistant"))
                .andExpect(jsonPath("$.messages[3].content", containsString("CARE-RESP")))
                .andExpect(jsonPath("$.messages[0].content", containsString("Không hỏi lại")))
                .andRespond(withSuccess(response("Dựa trên triệu chứng đã nêu..."), MediaType.APPLICATION_JSON));
        var history = List.of(new AiChatRequest.ChatMessage("user", "Bé ho nhiều và khó ngủ"),
                new AiChatRequest.ChatMessage("assistant", "Bé bao nhiêu tháng?"));
        var result = service.chatCareAssistant(new AiChatRequest("Bé 6 tháng, không sốt", null, history), UUID.randomUUID(), family.getId());
        assertEquals("HEALTH_GUIDANCE", result.route());
        verify(context).buildForQuestion(eq(family), contains("ho nhiều"));
        server.verify();
    }

    @Test void standaloneQuestionUsesRequestedAgeWithoutBabyData() throws Exception {
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(jsonPath("$.messages[1].content", not(containsString("TestBaby"))))
                .andExpect(jsonPath("$.messages[0].content", not(containsString("Định dạng bắt buộc"))))
                .andRespond(withSuccess(response("Với bé 18 tháng..."), MediaType.APPLICATION_JSON));
        var result = service.chatCareAssistant(new AiChatRequest("Bé 18 tháng ngủ bao nhiêu?", null, List.of()), UUID.randomUUID(), family.getId());
        assertEquals("KNOWLEDGE", result.route());
        verifyNoInteractions(context);
        server.verify();
    }

    @Test void safetyBlockRewritesOnceAndKeepsUsefulSafeAnswer() throws Exception {
        server.expect(requestTo("https://example.test/chat"))
                .andRespond(withSuccess(response("Cho paracetamol 100 mg."), MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(jsonPath("$.messages[0].content", containsString("Bản nháp bị bộ lọc")))
                .andRespond(withSuccess(response("Hãy đo nhiệt độ và cho biết cách đo."), MediaType.APPLICATION_JSON));
        var result = service.chatCareAssistant(new AiChatRequest("Bé sốt phải làm gì?", null, List.of()), UUID.randomUUID(), family.getId());
        assertEquals("Hãy đo nhiệt độ và cho biết cách đo.", result.answer());
        assertNull(result.safetyNote());
        server.verify();
    }

    @Test void incompleteAnswerRetriesWithoutShowingPartialText() throws Exception {
        String truncated = mapper.writeValueAsString(Map.of("choices", List.of(Map.of("finish_reason", "length",
                "message", Map.of("content", "Câu trả lời bị cắt")))));
        server.expect(requestTo("https://example.test/chat"))
                .andRespond(withSuccess(truncated, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(jsonPath("$.max_tokens").value(4800))
                .andRespond(withSuccess(response("App ghi nhận 300 ml."), MediaType.APPLICATION_JSON));
        var result = service.chatCareAssistant(new AiChatRequest("Hôm nay bé bú bao nhiêu ml?", null, List.of()), UUID.randomUUID(), family.getId());
        assertEquals("App ghi nhận 300 ml.", result.answer());
        server.verify();
    }

    @Test void unsafeRewriteStillFailsClosedWithoutThirdRequest() throws Exception {
        server.expect(requestTo("https://example.test/chat"))
                .andRespond(withSuccess(response("Cho paracetamol 100 mg."), MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://example.test/chat"))
                .andRespond(withSuccess(response("Cho paracetamol 200 mg."), MediaType.APPLICATION_JSON));
        var result = service.chatCareAssistant(new AiChatRequest("Bé sốt cần làm gì?", null, List.of()), UUID.randomUUID(), family.getId());
        assertFalse(result.answer().contains("200 mg"));
        assertNotNull(result.safetyNote());
        server.verify();
    }
}
