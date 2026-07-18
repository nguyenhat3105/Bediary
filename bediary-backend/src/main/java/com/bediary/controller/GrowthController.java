package com.bediary.controller;

import com.bediary.dto.GrowthRecordRequest;
import com.bediary.dto.GrowthRecordResponse;
import com.bediary.dto.NutritionSuggestionResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.GrowthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/growth")
public class GrowthController {

    private final GrowthService growthService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    public GrowthController(GrowthService growthService,
                             JwtUtil jwtUtil,
                             FamilyMemberRepository familyMemberRepository) {
        this.growthService = growthService;
        this.jwtUtil = jwtUtil;
        this.familyMemberRepository = familyMemberRepository;
    }

    /** POST /api/v1/growth/record */
    @PostMapping("/record")
    public ResponseEntity<GrowthRecordResponse> recordGrowth(
            @RequestBody GrowthRecordRequest request,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(growthService.recordGrowth(request, userId, familyId));
    }

    /** GET /api/v1/growth/history?page=0&size=20 */
    @GetMapping("/history")
    public ResponseEntity<List<GrowthRecordResponse>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(growthService.getHistory(familyId, page, size));
    }

    /** GET /api/v1/growth/latest */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatest(HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        try {
            return ResponseEntity.ok(growthService.getLatest(familyId));
        } catch (IllegalArgumentException e) {
            // No records yet — return empty 204 instead of 500
            return ResponseEntity.noContent().build();
        }
    }

    /** GET /api/v1/growth/nutrition-suggestions */
    @GetMapping("/nutrition-suggestions")
    public ResponseEntity<NutritionSuggestionResponse> getNutritionSuggestions(HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(growthService.getNutritionSuggestions(familyId));
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
