package com.bediary.controller;

import com.bediary.dto.TrackingLogRequest;
import com.bediary.dto.TrackingLogResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.TrackingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @PostMapping("/log")
    public ResponseEntity<TrackingLogResponse> logActivity(
            @Valid @RequestBody TrackingLogRequest request,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(trackingService.logActivity(request, userId, familyId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TrackingLogResponse> updateActivity(
            @PathVariable UUID id,
            @Valid @RequestBody TrackingLogRequest request,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(trackingService.updateActivity(id, request, userId, familyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        trackingService.deleteActivity(id, userId, familyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/daily")
    public ResponseEntity<List<TrackingLogResponse>> getDailyLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(trackingService.getDailyLogs(date, familyId));
    }

    private UUID resolveFamilyId(String token, UUID userId) {
        UUID familyId = jwtUtil.extractFamilyId(token);
        if (familyId == null) {
            familyId = familyMemberRepository.findFirstByUserId(userId)
                    .map(fm -> fm.getFamily().getId())
                    .orElseThrow(() -> new IllegalStateException("User has not joined any family yet"));
        }
        return familyId;
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new IllegalArgumentException("Authorization token required");
    }
}
