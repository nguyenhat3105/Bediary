package com.bediary.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.net.SocketTimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MediaStorageServiceTest {
    private MediaStorageService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setup() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new MediaStorageService(RestClient.create());
        ReflectionTestUtils.setField(service, "signingClient", builder.build());
        ReflectionTestUtils.setField(service, "supabaseUrl", "https://storage.test");
        ReflectionTestUtils.setField(service, "serviceRoleKey", "test-key");
        ReflectionTestUtils.setField(service, "bucket", "media");
        ReflectionTestUtils.setField(service, "signedUrlTtlSeconds", 900L);
    }

    @Test
    void reusesSignedUrlAcrossProfileAndDashboard() {
        server.expect(requestTo("https://storage.test/storage/v1/object/sign/media/avatar.jpg"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/media/avatar.jpg?token=test\"}", MediaType.APPLICATION_JSON));
        String url = service.resolveUrl("supabase:avatar.jpg", null);
        assertEquals("https://storage.test/storage/v1/object/sign/media/avatar.jpg?token=test", url);
        assertEquals(url, service.resolveUrl(null, "supabase:avatar.jpg"));
        server.verify();
    }

    @Test
    void storageTimeoutDoesNotRepeatForEveryAvatar() {
        server.expect(requestTo("https://storage.test/storage/v1/object/sign/media/avatar.jpg"))
                .andRespond(withException(new SocketTimeoutException("test")));
        assertNull(service.resolveUrl("supabase:avatar.jpg", null));
        assertNull(service.resolveUrl("supabase:other.jpg", null));
        assertNull(service.resolveUrl("supabase:avatar.jpg", null));
        server.verify();
    }

    @Test
    void doesNotReuseUrlsInsideExpirationSafetyWindow() {
        ReflectionTestUtils.setField(service, "signedUrlTtlSeconds", 60L);
        for (int i = 0; i < 2; i++) {
            server.expect(requestTo("https://storage.test/storage/v1/object/sign/media/avatar.jpg"))
                    .andRespond(withSuccess("{\"signedUrl\":\"/object/sign/media/avatar.jpg?token=test\"}", MediaType.APPLICATION_JSON));
        }
        assertNotNull(service.resolveUrl("supabase:avatar.jpg", null));
        assertNotNull(service.resolveUrl("supabase:avatar.jpg", null));
        server.verify();
    }

    @Test
    void missingImageDoesNotDisableOtherImages() {
        server.expect(requestTo("https://storage.test/storage/v1/object/sign/media/missing.jpg"))
                .andRespond(withResourceNotFound());
        server.expect(requestTo("https://storage.test/storage/v1/object/sign/media/avatar.jpg"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/media/avatar.jpg?token=test\"}", MediaType.APPLICATION_JSON));
        assertNull(service.resolveUrl("supabase:missing.jpg", null));
        assertNotNull(service.resolveUrl("supabase:avatar.jpg", null));
        server.verify();
    }
}
