package com.bediary.controller;

import com.bediary.dto.CreateFamilyRequest;
import com.bediary.dto.FamilyResponse;
import com.bediary.dto.JoinFamilyRequest;
import com.bediary.security.JwtUtil;
import com.bediary.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/families")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;
    private final JwtUtil jwtUtil;

    /**
     * POST /api/v1/families/create
     * Requires: ADMIN (first-time family creation)
     * Creates a family profile for the baby and assigns creator as ADMIN.
     */
    @PostMapping("/create")
    public ResponseEntity<FamilyResponse> createFamily(
            @Valid @RequestBody CreateFamilyRequest request,
            HttpServletRequest httpRequest) {

        UUID userId = extractUserId(httpRequest);
        return ResponseEntity.ok(familyService.createFamily(request, userId));
    }

    /**
     * POST /api/v1/families/join
     * Public (or authenticated) endpoint — grandparents join via invite code.
     * They get VIEWER role automatically.
     */
    @PostMapping("/join")
    public ResponseEntity<FamilyResponse> joinFamily(
            @Valid @RequestBody JoinFamilyRequest request,
            HttpServletRequest httpRequest) {

        UUID userId = extractUserId(httpRequest);
        return ResponseEntity.ok(familyService.joinFamily(request.inviteCode(), userId));
    }

    @DeleteMapping("/current")
    public ResponseEntity<Void> deleteCurrentFamily(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        familyService.deleteFamily(familyId, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(HttpServletRequest request) {
        return jwtUtil.extractUserId(extractToken(request));
    }

    private UUID resolveFamilyId(String token, UUID userId) {
        UUID familyId = jwtUtil.extractFamilyId(token);
        if (familyId == null) {
            familyId = familyService.getCurrentSessionFamilyId(userId);
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
