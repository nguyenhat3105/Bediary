package com.bediary.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.time.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GroqKeyPoolTest {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final RestClient client = builder.build();
    private final MutableClock clock = new MutableClock();

    private void limited(String key, int seconds) {
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + key))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", String.valueOf(seconds)));
    }
    private void success(String key) {
        server.expect(requestTo("https://example.test/chat"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + key))
                .andRespond(withSuccess("ok", MediaType.TEXT_PLAIN));
    }
    private String call(GroqKeyPool pool) { return pool.call(client, "https://example.test/chat", "legacy", Map.of("model", "test")); }

    @Test void rotatesInOrderThenSticksToSuccessfulKey() {
        var pool = new GroqKeyPool("key1,key2,key3", clock);
        limited("key1", 60); limited("key2", 60); success("key3"); success("key3");
        assertEquals("ok", call(pool)); assertEquals("ok", call(pool));
        server.verify();
    }
    @Test void rotatesThroughTwentyKeysInOrder() {
        String configured = java.util.stream.IntStream.rangeClosed(1, 20).mapToObj(i -> "key" + i).collect(java.util.stream.Collectors.joining(","));
        var pool = new GroqKeyPool(configured, clock);
        for (int i = 1; i < 20; i++) limited("key" + i, 60);
        success("key20"); success("key20");
        assertEquals("ok", call(pool)); assertEquals("ok", call(pool)); server.verify();
    }
    @Test void twentyExhaustedKeysStopAfterTwentyAttempts() {
        String configured = java.util.stream.IntStream.rangeClosed(1, 20).mapToObj(i -> "key" + i).collect(java.util.stream.Collectors.joining(","));
        var pool = new GroqKeyPool(configured, clock);
        for (int i = 1; i <= 20; i++) limited("key" + i, 60);
        assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool));
        assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool));
        server.verify();
    }
    @Test void honorsHttpDateRetryAfter() {
        var pool = new GroqKeyPool("key1", clock);
        String reset = java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(clock.instant().plusSeconds(90).atZone(ZoneOffset.UTC));
        server.expect(header(HttpHeaders.AUTHORIZATION, "Bearer key1"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header(HttpHeaders.RETRY_AFTER, reset));
        assertTrue(assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool)).retryAfterSeconds() >= 90);
        server.verify();
    }
    @Test void exhaustedPoolDoesNotLoopAndRecoversAfterCooldown() {
        var pool = new GroqKeyPool("key1,key2", clock);
        limited("key1", 60); limited("key2", 120); success("key1");
        var error = assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool));
        assertTrue(error.retryAfterSeconds() >= 60);
        assertFalse(error.getMessage().contains("key1"));
        assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool));
        clock.now = clock.now.plusSeconds(61);
        assertEquals("ok", call(pool)); server.verify();
    }
    @Test void invalidKeyIsDisabledAndDuplicatesAreRemoved() {
        var pool = new GroqKeyPool(" key1, key1, ,key2 ", clock);
        server.expect(header(HttpHeaders.AUTHORIZATION, "Bearer key1")).andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        success("key2"); success("key2");
        assertEquals("ok", call(pool)); clock.now = clock.now.plusSeconds(1000);
        assertEquals("ok", call(pool)); server.verify();
    }
    @Test void modelErrorDoesNotConsumeOtherKeys() {
        var pool = new GroqKeyPool("key1,key2", clock);
        server.expect(header(HttpHeaders.AUTHORIZATION, "Bearer key1")).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertThrows(RestClientResponseException.class, () -> call(pool)); server.verify();
    }
    @Test void supportsLegacySingleKeyConfiguration() {
        var pool = new GroqKeyPool("", clock); success("legacy");
        assertEquals("ok", call(pool)); server.verify();
    }
    @Test void usesQuotaResetHeaderWhenRetryAfterIsAbsent() {
        var pool = new GroqKeyPool("key1", clock);
        server.expect(header(HttpHeaders.AUTHORIZATION, "Bearer key1"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .header("x-ratelimit-remaining-requests", "0").header("x-ratelimit-reset-requests", "2m30s"));
        var error = assertThrows(GroqKeyPool.UnavailableException.class, () -> call(pool));
        assertTrue(error.retryAfterSeconds() >= 150); server.verify();
    }
    @Test void springCreatesConfiguredSharedPool() {
        try (var context = new org.springframework.context.annotation.AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("test", Map.of("groq.api-keys", "key1,key2")));
            context.register(GroqKeyPool.class); context.refresh();
            assertSame(context.getBean(GroqKeyPool.class), context.getBean(GroqKeyPool.class));
            limited("key1", 10); success("key2");
            assertEquals("ok", call(context.getBean(GroqKeyPool.class))); server.verify();
        }
    }
    private static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-09-09T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
}
