package com.bediary.service;

import com.bediary.dto.HealthRecordImportResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HealthRecordImportServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private HealthRecordImportService service;
    private MockRestServiceServer server;
    private static final String VALID = "{\"extractedText\":\"Example document\",\"warnings\":[],\"records\":[]}";

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new HealthRecordImportService(builder.build(), new GroqKeyPool(""), mapper, mock(FamilyMemberRepository.class));
        ReflectionTestUtils.setField(service, "groqApiKey", "test-key");
        ReflectionTestUtils.setField(service, "groqApiUrl", "https://example.test/chat");
    }

    private String response(String content, String finishReason) throws Exception {
        return mapper.writeValueAsString(Map.of("choices", java.util.List.of(Map.of(
                "message", Map.of("content", content), "finish_reason", finishReason))));
    }

    private void expectResponse(int tokens, String content, String reason) throws Exception {
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(jsonPath("$.max_tokens").value(tokens))
                .andRespond(withSuccess(response(content, reason), MediaType.APPLICATION_JSON));
    }

    @Test
    void stopsOcrFallbacksWhenQuotaIsUnavailable() {
        ReflectionTestUtils.setField(service, "visionModel", "vision-primary");
        ReflectionTestUtils.setField(service, "visionFallbackModels", "vision-fallback");
        server.expect(requestTo("https://example.test/chat"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators
                        .withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS)
                        .header("Retry-After", "52"));
        assertThrows(GroqKeyPool.UnavailableException.class,
                () -> ReflectionTestUtils.invokeMethod(service, "extractTextFromImage", "data:image/jpeg;base64,test"));
        server.verify();
    }

    @Test
    void quotaMessageExplainsWhenToRetryWithoutApiKeyDetails() {
        String message = ReflectionTestUtils.invokeMethod(service, "readableImportError",
                new GroqKeyPool.UnavailableException(52));
        assertNotNull(message);
        assertTrue(message.contains("52"));
        assertFalse(message.contains("API key"));
    }

    @Test
    void retriesTruncatedJsonWithLargerBudget() throws Exception {
        expectResponse(4400, "{\"extractedText\":\"Example\",\"warnings\":[],\"records\":[{}", "length");
        expectResponse(8800, VALID, "stop");
        String result = ReflectionTestUtils.invokeMethod(service, "callImport", Map.of("model", "test"));
        assertEquals(response(VALID, "stop"), result);
        server.verify();
    }

    @Test
    void invalidJsonWithoutLengthReasonAlsoRetriesAndStopsAfterTwoAttempts() throws Exception {
        expectResponse(4400, "{\"records\":[{}", "stop");
        expectResponse(8800, "{\"records\":[{}", "stop");
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> ReflectionTestUtils.invokeMethod(service, "callImport", Map.of("model", "test")));
        assertEquals("AI_IMPORT_INVALID_RESPONSE", error.getMessage());
        server.verify();
    }

    @Test
    void rejectsLengthFinishEvenWhenJsonLooksComplete() throws Exception {
        String raw = response(VALID, "length");
        assertThrows(IllegalStateException.class,
                () -> ReflectionTestUtils.invokeMethod(service, "parseImportResponse", raw));
    }

    @Test
    void acceptsMarkdownWrappedJsonAndPreservesExtractedTextFallback() throws Exception {
        HealthRecordImportResponse result = ReflectionTestUtils.invokeMethod(service, "parseImportResponse",
                response("```json\n" + VALID + "\n```", "stop"));
        assertNotNull(result);
        assertEquals("Example document", result.extractedText());
        assertEquals(1, result.records().size());
    }

    @Test
    void reportsWrappedModelNotFoundAsConfigurationError() {
        var upstream = org.springframework.web.client.HttpClientErrorException.create(
                org.springframework.http.HttpStatus.NOT_FOUND, "Not Found",
                org.springframework.http.HttpHeaders.EMPTY,
                "{\"error\":{\"code\":\"model_not_found\"}}".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                java.nio.charset.StandardCharsets.UTF_8);
        String message = ReflectionTestUtils.invokeMethod(service, "readableImportError",
                new IllegalStateException("Vision models failed", upstream));
        assertNotNull(message);
        assertTrue(message.contains("GROQ_VISION_MODEL"));
    }

    @Test
    void usesOnlyConfiguredVisionModelsAndDeduplicatesFallbacks() {
        ReflectionTestUtils.setField(service, "visionModel", "qwen/qwen3.6-27b");
        ReflectionTestUtils.setField(service, "visionFallbackModels", "");
        assertEquals(java.util.List.of("qwen/qwen3.6-27b"),
                ReflectionTestUtils.invokeMethod(service, "visionModels"));
        ReflectionTestUtils.setField(service, "visionFallbackModels", " qwen/qwen3.6-27b, custom-vision, ");
        assertEquals(java.util.List.of("qwen/qwen3.6-27b", "custom-vision"),
                ReflectionTestUtils.invokeMethod(service, "visionModels"));
    }

    @Test
    void rejectsMissingChoicesAndInvalidSchema() throws Exception {
        assertThrows(IllegalStateException.class,
                () -> ReflectionTestUtils.invokeMethod(service, "parseImportResponse", "{}"));
        String raw = response("{\"records\":[null],\"warnings\":[],\"extractedText\":\"test\"}", "stop");
        assertThrows(IllegalStateException.class,
                () -> ReflectionTestUtils.invokeMethod(service, "parseImportResponse", raw));
    }
}
