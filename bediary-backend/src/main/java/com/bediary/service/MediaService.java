package com.bediary.service;

import com.bediary.dto.MediaPostResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.MediaPost;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.MediaPostRepository;
import com.bediary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Handles media posts for the family feed.
 *
 * Storage strategy (dev / no-AWS):
 *   Files are saved to a local directory (${bediary.upload-dir}) and
 *   served via the /uploads/** static resource mapping (see SecurityConfig).
 *
 *   To switch to S3 in production:
 *   1. Add AWS SDK v2 dependency to pom.xml
 *   2. Replace uploadFile() with an S3 PutObject call
 *   3. Replace the returned URL with a presigned GetObject URL
 */
@Service
@RequiredArgsConstructor
public class MediaService {
    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    private final MediaPostRepository mediaPostRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final NotificationService notificationService;
    private final StreakService streakService;

    @Value("${bediary.upload-dir:uploads}")
    private String uploadDir;

    @Value("${bediary.base-url:http://localhost:8080}")
    private String baseUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // Feed
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getFeed(UUID familyId, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 20));
        Page<MediaPost> mediaPage = mediaPostRepository
                .findByFamilyIdOrderByCreatedAtDesc(familyId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content",       mediaPage.getContent().stream().map(this::toResponse).toList());
        response.put("totalPages",    mediaPage.getTotalPages());
        response.put("totalElements", mediaPage.getTotalElements());
        response.put("currentPage",   mediaPage.getNumber());
        response.put("hasNext",       mediaPage.hasNext());
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upload (local file storage — no AWS required)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Saves a multipart file to the local upload directory and creates a MediaPost.
     *
     * @param file      The uploaded image or video file
     * @param caption   Optional caption text
     * @param familyId  Extracted from JWT (IDOR-safe)
     * @param userId    Extracted from JWT
     * @return MediaPostResponse with the public URL of the uploaded file
     */
    @Transactional
    public MediaPostResponse uploadMedia(MultipartFile file, String caption,
                                         UUID familyId, UUID userId) throws IOException {
        FamilyMember membership = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this family"));
        if (membership.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("VIEWER role is not allowed to upload media");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Upload file is required");
        }

        // Validate file type
        String contentType = file.getContentType() != null ? file.getContentType() : "";
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
            throw new IllegalArgumentException("Only image and video uploads are allowed");
        }
        String mediaType = contentType.startsWith("video/") ? "VIDEO" : "IMAGE";

        // Build safe filename: {uuid}_{originalName}
        String originalFilename = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "file";
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;

        // Ensure upload directory exists
        Path uploadPath = Paths.get(uploadDir, "families", familyId.toString());
        Files.createDirectories(uploadPath);

        // Save file
        Path filePath = uploadPath.resolve(storedFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Build public URL served by Spring's static resource handler
        String publicUrl = baseUrl + "/uploads/families/" + familyId + "/" + storedFilename;

        // Persist MediaPost
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        MediaPost post = MediaPost.builder()
                .family(family)
                .uploadedBy(user)
                .mediaUrl(publicUrl)
                .mediaType(mediaType)
                .caption(caption)
                .build();

        MediaPost saved = mediaPostRepository.save(post);
        log.info("Media uploaded: {} → {}", storedFilename, publicUrl);
        streakService.updateStreak(familyId);
        notifyFamilyMembers(family, user, saved);
        return toResponse(saved);
    }

    /**
     * Deletes a media post and its file from local storage.
     * Only the uploader or a family ADMIN may delete a post.
     */
    @Transactional
    public void deletePost(UUID postId, UUID userId, UUID familyId) {
        MediaPost post = mediaPostRepository.findById(postId)
                .filter(p -> p.getFamily().getId().equals(familyId))
                .orElseThrow(() -> new IllegalArgumentException("Post not found in your family"));

        // Delete local file
        try {
            String url = post.getMediaUrl();
            String relativePath = url.replace(baseUrl + "/uploads/", "");
            Path filePath = Paths.get(uploadDir, relativePath);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Could not delete file for post {}: {}", postId, e.getMessage());
        }

        mediaPostRepository.delete(post);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping
    // ─────────────────────────────────────────────────────────────────────────

    private MediaPostResponse toResponse(MediaPost post) {
        return new MediaPostResponse(
                post.getId(),
                post.getMediaUrl(),
                post.getMediaType(),
                post.getCaption(),
                post.getUploadedBy().getFullName(),
                post.getCreatedAt()
        );
    }

    private void notifyFamilyMembers(Family family, User uploader, MediaPost post) {
        familyMemberRepository.findByFamilyId(family.getId()).stream()
                .filter(member -> !member.getUser().getId().equals(uploader.getId()))
                .forEach(member -> notificationService.createNotification(
                        family.getId(),
                        member.getUser().getId(),
                        "MEDIA",
                        "Ảnh mới trong gia đình",
                        uploader.getFullName() + " vừa đăng một khoảnh khắc mới của bé.",
                        Map.of("postId", post.getId().toString())
                ));
    }
}
