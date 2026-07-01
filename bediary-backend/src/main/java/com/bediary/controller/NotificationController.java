package com.bediary.controller;

import com.bediary.dto.NotificationPageResponse;
import com.bediary.dto.NotificationResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    /** GET /api/v1/notifications?page=0&size=20 */
    @GetMapping
    public ResponseEntity<NotificationPageResponse> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        return ResponseEntity.ok(notificationService.getNotifications(userId, page, size));
    }

    /** PATCH /api/v1/notifications/{id}/read */
    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        return ResponseEntity.ok(notificationService.markRead(id, userId));
    }

    /** PATCH /api/v1/notifications/read-all */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        notificationService.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/v1/notifications/unread-count */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(userId)));
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new IllegalArgumentException("Authorization token required");
    }
}
