package com.bediary.controller;

import com.bediary.dto.HealthSubjectRequest;
import com.bediary.dto.HealthSubjectResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.HealthSubjectService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/health-subjects")
@RequiredArgsConstructor
public class HealthSubjectController {

    private final HealthSubjectService healthSubjectService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @GetMapping
    public ResponseEntity<List<HealthSubjectResponse>> list(HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthSubjectService.list(familyId));
    }

    @PostMapping
    public ResponseEntity<HealthSubjectResponse> create(
            @Valid @RequestBody HealthSubjectRequest body,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthSubjectService.create(userId, familyId, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        healthSubjectService.delete(userId, familyId, id);
        return ResponseEntity.noContent().build();
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
