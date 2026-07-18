package com.bediary.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class MediaStorageService {
    private static final Logger log = LoggerFactory.getLogger(MediaStorageService.class);
    private static final String SUPABASE_PREFIX = "supabase:";
    private static final String LOCAL_PREFIX = "local:";

    private final RestClient restClient;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket:bediary-media}")
    private String bucket;

    @Value("${supabase.storage.signed-url-ttl-seconds:900}")
    private long signedUrlTtlSeconds;

    @Value("${bediary.upload-dir:uploads}")
    private String uploadDir;

    @Value("${server.servlet.context-path:/api/v1}")
    private String contextPath;

    public MediaStorageService(RestClient restClient) {
        this.restClient = restClient;
    }

    public StoredFile upload(MultipartFile file, String folder, String fallbackFilename) throws IOException {
        String originalFilename = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : fallbackFilename;
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;
        String objectPath = trimSlashes(folder) + "/" + storedFilename;

        if (isSupabaseEnabled()) {
            uploadToSupabase(file, objectPath);
            return new StoredFile(SUPABASE_PREFIX + objectPath, resolveUrl(SUPABASE_PREFIX + objectPath, null));
        }

        Path uploadPath = Paths.get(uploadDir, trimSlashes(folder));
        Files.createDirectories(uploadPath);
        Files.copy(file.getInputStream(), uploadPath.resolve(storedFilename), StandardCopyOption.REPLACE_EXISTING);
        String localRef = LOCAL_PREFIX + objectPath;
        return new StoredFile(localRef, resolveUrl(localRef, null));
    }

    public String resolveUrl(String storageRef, String legacyUrl) {
        if (StringUtils.hasText(storageRef)) {
            if (storageRef.startsWith(SUPABASE_PREFIX)) {
                return createSignedUrl(storageRef.substring(SUPABASE_PREFIX.length()));
            }
            if (storageRef.startsWith(LOCAL_PREFIX)) {
                return normalizeContextPath() + "/uploads/" + storageRef.substring(LOCAL_PREFIX.length());
            }
        }
        if (!StringUtils.hasText(legacyUrl)) {
            return legacyUrl;
        }
        if (legacyUrl.startsWith(SUPABASE_PREFIX)) {
            return createSignedUrl(legacyUrl.substring(SUPABASE_PREFIX.length()));
        }
        if (legacyUrl.startsWith(LOCAL_PREFIX)) {
            return normalizeContextPath() + "/uploads/" + legacyUrl.substring(LOCAL_PREFIX.length());
        }
        return legacyUrl;
    }

    public void delete(String storageRef, String legacyUrl) throws IOException {
        if (StringUtils.hasText(storageRef)) {
            if (storageRef.startsWith(SUPABASE_PREFIX)) {
                deleteSupabaseObject(storageRef.substring(SUPABASE_PREFIX.length()));
                return;
            }
            if (storageRef.startsWith(LOCAL_PREFIX)) {
                Files.deleteIfExists(Paths.get(uploadDir, storageRef.substring(LOCAL_PREFIX.length())));
                return;
            }
        }
        String relativePath = extractUploadRelativePath(legacyUrl);
        if (StringUtils.hasText(relativePath)) {
            Files.deleteIfExists(Paths.get(uploadDir, relativePath));
        }
    }

    public void deleteLocalFamilyFolders(UUID familyId) throws IOException {
        FileSystemUtils.deleteRecursively(Paths.get(uploadDir, "families", familyId.toString()));
        FileSystemUtils.deleteRecursively(Paths.get(uploadDir, "babies", familyId.toString()));
    }

    private void uploadToSupabase(MultipartFile file, String objectPath) throws IOException {
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        restClient.post()
                .uri(storageObjectUrl(objectPath))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("x-upsert", "true")
                .contentType(MediaType.parseMediaType(contentType))
                .body(file.getBytes())
                .retrieve()
                .toBodilessEntity();
    }

    private String createSignedUrl(String objectPath) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(storageSignUrl(objectPath))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", signedUrlTtlSeconds))
                    .retrieve()
                    .body(Map.class);

            Object signedUrl = response != null ? response.get("signedURL") : null;
            if (signedUrl == null) {
                signedUrl = response != null ? response.get("signedUrl") : null;
            }
            if (signedUrl instanceof String value && StringUtils.hasText(value)) {
                return normalizeSupabaseSignedUrl(value);
            }
        } catch (Exception e) {
            log.warn("Could not create Supabase signed URL for {}: {}", objectPath, e.getMessage());
        }
        return null;
    }

    private void deleteSupabaseObject(String objectPath) {
        try {
            restClient.method(HttpMethod.DELETE)
                    .uri(trimTrailingSlash(supabaseUrl) + "/storage/v1/object/" + bucket)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .body(Map.of("prefixes", new String[]{objectPath}))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Could not delete Supabase object {}: {}", objectPath, e.getMessage());
        }
    }

    private String storageObjectUrl(String objectPath) {
        return UriComponentsBuilder
                .fromUriString(trimTrailingSlash(supabaseUrl))
                .pathSegment("storage", "v1", "object", bucket)
                .path("/")
                .path(objectPath)
                .build()
                .toUriString();
    }

    private String normalizeSupabaseSignedUrl(String signedUrl) {
        if (signedUrl.startsWith("http")) {
            return signedUrl;
        }
        String base = trimTrailingSlash(supabaseUrl);
        if (signedUrl.startsWith("/storage/v1/")) {
            return base + signedUrl;
        }
        if (signedUrl.startsWith("/")) {
            return base + "/storage/v1" + signedUrl;
        }
        return base + "/storage/v1/" + signedUrl;
    }

    private String storageSignUrl(String objectPath) {
        return UriComponentsBuilder
                .fromUriString(trimTrailingSlash(supabaseUrl))
                .pathSegment("storage", "v1", "object", "sign", bucket)
                .path("/")
                .path(objectPath)
                .build()
                .toUriString();
    }

    private boolean isSupabaseEnabled() {
        return StringUtils.hasText(supabaseUrl)
                && StringUtils.hasText(serviceRoleKey)
                && StringUtils.hasText(bucket);
    }

    private String normalizeContextPath() {
        if (!StringUtils.hasText(contextPath) || "/".equals(contextPath)) {
            return "";
        }
        return contextPath.startsWith("/") ? contextPath : "/" + contextPath;
    }

    private String extractUploadRelativePath(String mediaUrl) {
        if (!StringUtils.hasText(mediaUrl)) {
            return "";
        }
        String path = mediaUrl;
        try {
            URI uri = URI.create(mediaUrl);
            if (uri.getPath() != null) {
                path = uri.getPath();
            }
        } catch (IllegalArgumentException ignored) {
            // Legacy values may already be relative paths.
        }

        String marker = "/uploads/";
        int index = path.indexOf(marker);
        return index >= 0 ? path.substring(index + marker.length()) : path.replaceFirst("^/", "");
    }

    private String trimSlashes(String value) {
        return value == null ? "" : value.replaceAll("^/+", "").replaceAll("/+$", "");
    }

    private String trimTrailingSlash(String value) {
        return value == null ? "" : value.replaceAll("/+$", "");
    }
}
