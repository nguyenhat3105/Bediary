package com.bediary.controller;

import com.bediary.dto.*;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.RoutineService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    /** GET /api/v1/routines — all family roles */
    @GetMapping
    public ResponseEntity<List<RoutineResponse>> getRoutines(HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID familyId = resolveFamilyId(token, jwtUtil.extractUserId(token));
        return ResponseEntity.ok(routineService.getRoutines(familyId));
    }

    /** POST /api/v1/routines — PARENT only */
    @PostMapping
    public ResponseEntity<RoutineResponse> createRoutine(
            @Valid @RequestBody RoutineRequest request,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(routineService.createRoutine(request, userId, familyId));
    }

    /** PUT /api/v1/routines/{id} — PARENT only */
    @PutMapping("/{id}")
    public ResponseEntity<RoutineResponse> updateRoutine(
            @PathVariable UUID id,
            @Valid @RequestBody RoutineRequest request,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(routineService.updateRoutine(id, request, userId, familyId));
    }

    /** DELETE /api/v1/routines/{id} — PARENT only (soft-delete) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoutine(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        routineService.deleteRoutine(id, userId, familyId);
        return ResponseEntity.noContent().build();
    }

    /** POST /api/v1/routines/{id}/log — PARENT only */
    @PostMapping("/{id}/log")
    public ResponseEntity<RoutineLogResponse> logRoutine(
            @PathVariable UUID id,
            @Valid @RequestBody RoutineLogRequest request,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(routineService.logRoutine(id, request, userId, familyId));
    }

    /** PATCH /api/v1/routines/{id}/reschedule — PARENT only */
    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<RoutineResponse> rescheduleRoutine(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String token    = extractToken(httpRequest);
        UUID userId     = jwtUtil.extractUserId(token);
        UUID familyId   = resolveFamilyId(token, userId);
        LocalTime newTime = LocalTime.parse(body.get("scheduledTime"));
        return ResponseEntity.ok(routineService.rescheduleRoutine(id, newTime, userId, familyId));
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
