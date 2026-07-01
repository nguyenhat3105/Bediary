package com.bediary.controller;

import com.bediary.dto.DashboardResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.DashboardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/home")
@RequiredArgsConstructor
public class HomeController {

    private final DashboardService dashboardService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    /**
     * GET /api/v1/home/dashboard
     * Returns the aggregated home screen data for the calling user's family.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(dashboardService.getDashboard(userId, familyId));
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
