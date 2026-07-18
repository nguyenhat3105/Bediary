package com.bediary.controller;

import com.bediary.dto.ProfileResponse;
import com.bediary.dto.UpdateProfileRequest;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    public ProfileController(ProfileService profileService,
                              JwtUtil jwtUtil,
                              FamilyMemberRepository familyMemberRepository) {
        this.profileService = profileService;
        this.jwtUtil = jwtUtil;
        this.familyMemberRepository = familyMemberRepository;
    }

    /** GET /api/v1/profile */
    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(profileService.getProfile(userId, familyId));
    }

    /** PATCH /api/v1/profile */
    @PatchMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @RequestBody UpdateProfileRequest req,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(profileService.updateProfile(userId, familyId, req));
    }

    /** POST /api/v1/profile/avatar */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProfileResponse> updateAvatar(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) throws Exception {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(profileService.updateAvatar(userId, familyId, file));
    }

    private UUID resolveFamilyId(String token, UUID userId) {
        UUID familyId = jwtUtil.extractFamilyId(token);
        if (familyId == null) {
            familyId = familyMemberRepository.findFirstByUserId(userId)
                    .map(fm -> fm.getFamily().getId())
                    .orElse(null);
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
