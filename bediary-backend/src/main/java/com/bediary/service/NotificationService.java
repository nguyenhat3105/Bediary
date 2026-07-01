package com.bediary.service;

import com.bediary.dto.NotificationPageResponse;
import com.bediary.dto.NotificationResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;

    @Transactional
    public Notification createNotification(UUID familyId, UUID userId,
                                            String type, String title, String body,
                                            Map<String, Object> payload) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Notification notification = Notification.builder()
                .family(family)
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .payload(payload)
                .build();

        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse getNotifications(UUID userId, int page, int size) {
        Page<Notification> pageResult = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        List<NotificationResponse> content = pageResult.getContent()
                .stream().map(this::toResponse).toList();

        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);

        return new NotificationPageResponse(
                content,
                unreadCount,
                pageResult.getTotalPages(),
                pageResult.getTotalElements(),
                page
        );
    }

    @Transactional
    public NotificationResponse markRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Cannot mark another user's notification as read");
        }

        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.isRead(),
                n.getCreatedAt(),
                n.getPayload()
        );
    }
}
