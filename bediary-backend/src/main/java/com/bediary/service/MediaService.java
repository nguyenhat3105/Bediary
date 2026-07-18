package com.bediary.service;

import com.bediary.dto.MediaPostResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.MediaPost;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.MediaPostRepository;
import com.bediary.repository.PostReactionRepository;
import com.bediary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {
    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    private final MediaPostRepository mediaPostRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PostReactionRepository postReactionRepository;
    private final NotificationService notificationService;
    private final StreakService streakService;
    private final MediaStorageService mediaStorageService;
    private final UploadValidationService uploadValidationService;

    @Transactional(readOnly = true)
    public Map<String, Object> getFeed(UUID familyId, UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 20));
        Page<MediaPost> mediaPage = mediaPostRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("content", mediaPage.getContent().stream().map(post -> toResponse(post, userId)).toList());
        response.put("totalPages", mediaPage.getTotalPages());
        response.put("totalElements", mediaPage.getTotalElements());
        response.put("currentPage", mediaPage.getNumber());
        response.put("hasNext", mediaPage.hasNext());
        return response;
    }

    @Transactional
    public MediaPostResponse uploadMedia(MultipartFile file, String caption, UUID familyId, UUID userId) throws IOException {
        FamilyMember membership = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bạn chưa tham gia nhật ký gia đình này."));
        if (membership.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("Tài khoản này chỉ có quyền xem nên chưa thể đăng ảnh/video. Ba mẹ cần đổi quyền thành Người chăm sóc hoặc Quản trị.");
        }
        String mediaType = uploadValidationService.requireImageOrVideo(file);

        StoredFile storedFile = mediaStorageService.upload(file, "families/" + familyId, "file");

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        MediaPost post = MediaPost.builder()
                .family(family)
                .uploadedBy(user)
                .mediaUrl(storedFile.storageRef())
                .mediaStoragePath(storedFile.storageRef())
                .mediaType(mediaType)
                .caption(caption)
                .build();

        MediaPost saved = mediaPostRepository.save(post);
        log.info("Media uploaded for family {} -> {}", familyId, storedFile.storageRef());
        streakService.updateStreak(familyId);
        notifyFamilyMembers(family, user, saved);
        return toResponse(saved, userId);
    }

    @Transactional
    public void deletePost(UUID postId, UUID userId, UUID familyId) {
        MediaPost post = mediaPostRepository.findById(postId)
                .filter(p -> p.getFamily().getId().equals(familyId))
                .orElseThrow(() -> new IllegalArgumentException("Post not found in your family"));

        try {
            mediaStorageService.delete(post.getMediaStoragePath(), post.getMediaUrl());
        } catch (IOException e) {
            log.warn("Could not delete file for post {}: {}", postId, e.getMessage());
        }

        mediaPostRepository.delete(post);
    }

    private MediaPostResponse toResponse(MediaPost post, UUID userId) {
        return new MediaPostResponse(
                post.getId(),
                mediaStorageService.resolveUrl(post.getMediaStoragePath(), post.getMediaUrl()),
                post.getMediaType(),
                post.getCaption(),
                post.getUploadedBy().getFullName(),
                mediaStorageService.resolveUrl(post.getUploadedBy().getAvatarStoragePath(), post.getUploadedBy().getAvatarUrl()),
                post.getCreatedAt(),
                post.getReactionCount(),
                post.getCommentCount(),
                userId != null && postReactionRepository.existsByPostIdAndUserId(post.getId(), userId)
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
