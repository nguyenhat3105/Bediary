package com.bediary.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** One shared, sequential pool for chat, captions and OCR within this backend process. */
@Component
public class GroqKeyPool {
    private final List<KeyState> keys = new ArrayList<>();
    private final Clock clock;
    private int current;

    @org.springframework.beans.factory.annotation.Autowired
    public GroqKeyPool(@Value("${groq.api-keys:}") String configuredKeys) {
        this(configuredKeys, Clock.systemUTC());
    }

    GroqKeyPool(String configuredKeys, Clock clock) {
        this.clock = clock;
        Arrays.stream(configuredKeys.split(","))
                .map(String::trim).filter(key -> !key.isEmpty()).distinct()
                .forEach(key -> keys.add(new KeyState(key)));
    }

    public String call(RestClient client, String url, String legacyKey, Map<String, Object> body) {
        initializeLegacyKey(legacyKey);
        Set<Integer> attempted = new HashSet<>();
        while (true) {
            int index = acquire(attempted);
            attempted.add(index);
            String key;
            synchronized (this) { key = keys.get(index).value; }
            try {
                return client.post().uri(url)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                        .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            } catch (RestClientResponseException error) {
                int status = error.getStatusCode().value();
                if (status != 429 && status != 401) throw error;
                synchronized (this) {
                    KeyState state = keys.get(index);
                    if (status == 401) state.disabled = true;
                    else {
                        Instant reset = clock.instant().plusSeconds(retrySeconds(error.getResponseHeaders()));
                        if (reset.isAfter(state.availableAt)) state.availableAt = reset;
                    }
                    if (current == index) current = (index + 1) % keys.size();
                }
            }
        }
    }

    private synchronized void initializeLegacyKey(String key) {
        if (keys.isEmpty() && key != null && !key.isBlank()) keys.add(new KeyState(key.trim()));
        if (keys.isEmpty()) throw new IllegalStateException("GROQ_API_KEY or GROQ_API_KEYS is not configured");
    }

    private synchronized int acquire(Set<Integer> attempted) {
        Instant now = clock.instant();
        for (int offset = 0; offset < keys.size(); offset++) {
            int index = (current + offset) % keys.size();
            KeyState state = keys.get(index);
            if (!attempted.contains(index) && !state.disabled && !state.availableAt.isAfter(now)) {
                current = index;
                return index;
            }
        }
        long retry = keys.stream().filter(state -> !state.disabled)
                .mapToLong(state -> Math.max(1, Duration.between(now, state.availableAt).toSeconds() + 1))
                .min().orElse(0);
        throw new UnavailableException(retry);
    }

    private long retrySeconds(HttpHeaders headers) {
        if (headers == null) return 60;
        String retry = headers.getFirst(HttpHeaders.RETRY_AFTER);
        if (retry != null) {
            try { return Math.max(1, (long) Math.ceil(Double.parseDouble(retry))); }
            catch (NumberFormatException ignored) {
                try { return Math.max(1, Duration.between(clock.instant(), ZonedDateTime.parse(retry, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).toSeconds() + 1); }
                catch (RuntimeException invalidDate) { /* Use quota reset headers below. */ }
            }
        }
        long reset = 0;
        for (String type : List.of("requests", "tokens")) {
            if ("0".equals(headers.getFirst("x-ratelimit-remaining-" + type)))
                reset = Math.max(reset, parseReset(headers.getFirst("x-ratelimit-reset-" + type)));
        }
        return reset > 0 ? reset : 60;
    }

    private long parseReset(String value) {
        if (value == null) return 0;
        var matcher = java.util.regex.Pattern.compile("(\\d+(?:\\.\\d+)?)(ms|s|m|h|d)").matcher(value);
        double seconds = 0;
        while (matcher.find()) seconds += Double.parseDouble(matcher.group(1)) * switch (matcher.group(2)) {
            case "d" -> 86400; case "h" -> 3600; case "m" -> 60; case "ms" -> .001; default -> 1;
        };
        return (long) Math.ceil(seconds);
    }

    private static final class KeyState {
        final String value;
        Instant availableAt = Instant.EPOCH;
        boolean disabled;
        KeyState(String value) { this.value = value; }
    }

    public static final class UnavailableException extends RuntimeException {
        private final long retryAfterSeconds;
        UnavailableException(long retryAfterSeconds) {
            super(retryAfterSeconds > 0
                    ? "Các API key AI đang chạm hạn mức. Vui lòng thử lại sau khoảng " + retryAfterSeconds + " giây."
                    : "Các API key AI không còn hợp lệ. Cần cập nhật cấu hình backend.");
            this.retryAfterSeconds = retryAfterSeconds;
        }
        public long retryAfterSeconds() { return retryAfterSeconds; }
    }
}
