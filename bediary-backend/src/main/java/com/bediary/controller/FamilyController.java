package com.bediary.controller;

import com.bediary.dto.BabyJournalResponse;
import com.bediary.dto.CreateFamilyRequest;
import com.bediary.dto.FamilyResponse;
import com.bediary.dto.JoinFamilyRequest;
import com.bediary.dto.ProfileResponse;
import com.bediary.entity.FamilyMember;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.FamilyService;
import com.bediary.service.MediaStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/families")
public class FamilyController {

    private final FamilyService familyService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;
    private final MediaStorageService mediaStorageService;

    public FamilyController(FamilyService familyService,
                            JwtUtil jwtUtil,
                            FamilyMemberRepository familyMemberRepository,
                            MediaStorageService mediaStorageService) {
        this.familyService = familyService;
        this.jwtUtil = jwtUtil;
        this.familyMemberRepository = familyMemberRepository;
        this.mediaStorageService = mediaStorageService;
    }

    /**
     * POST /api/v1/families/create
     * Creates a baby journal and assigns creator as PARENT.
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

    @GetMapping("/my-journals")
    public ResponseEntity<List<BabyJournalResponse>> getMyJournals(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID activeFamilyId = jwtUtil.extractFamilyId(token);
        return ResponseEntity.ok(familyService.getMyJournals(userId, activeFamilyId));
    }

    @PostMapping("/switch/{familyId}")
    public ResponseEntity<FamilyResponse> switchFamily(
            @PathVariable UUID familyId,
            HttpServletRequest httpRequest) {
        UUID userId = extractUserId(httpRequest);
        return ResponseEntity.ok(familyService.switchFamily(familyId, userId));
    }

    @PostMapping(value = "/current/baby-avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BabyJournalResponse> updateCurrentBabyAvatar(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) throws Exception {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(familyService.updateBabyAvatar(familyId, userId, file));
    }

    /** GET /api/v1/families/members — list all members of current family */
    @GetMapping("/members")
    public ResponseEntity<List<ProfileResponse.MemberInfo>> getMembers(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        List<FamilyMember> members = familyMemberRepository.findByFamilyId(familyId);
        List<ProfileResponse.MemberInfo> result = members.stream()
            .map(m -> new ProfileResponse.MemberInfo(
                m.getUser().getId(),
                m.getUser().getFullName(),
                mediaStorageService.resolveUrl(m.getUser().getAvatarStoragePath(), m.getUser().getAvatarUrl()),
                m.getRole().name(),
                switch (m.getRole()) {
                    case ADMIN     -> "Quản trị hệ thống";
                    case PARENT    -> "Ba mẹ";
                    case CAREGIVER -> "Người chăm sóc";
                    case VIEWER    -> "Người thân";
                }
            )).toList();
        return ResponseEntity.ok(result);
    }

    /** DELETE /api/v1/families/members/{memberId} — PARENT removes a non-parent member */
    @DeleteMapping("/members/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID memberId, HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID currentUserId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, currentUserId);
        // Only parents/admins can remove members.
        FamilyMember currentMember = familyMemberRepository.findByFamilyIdAndUserId(familyId, currentUserId)
            .orElseThrow(() -> new IllegalStateException("Not a member"));
        if (!canManageFamily(currentMember.getRole())) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ Ba mẹ mới có thể xóa thành viên");
        }
        // Cannot remove yourself
        if (memberId.equals(currentUserId)) {
            return ResponseEntity.badRequest().build();
        }
        familyMemberRepository.findByFamilyIdAndUserId(familyId, memberId)
            .ifPresent(familyMemberRepository::delete);
        return ResponseEntity.noContent().build();
    }

    /** PATCH /api/v1/families/members/{memberId}/role — PARENT can set CAREGIVER or VIEWER */
    @PatchMapping("/members/{memberId}/role")
    public ResponseEntity<Map<String, String>> changeMemberRole(
            @PathVariable UUID memberId,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID currentUserId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, currentUserId);
        FamilyMember currentMember = familyMemberRepository.findByFamilyIdAndUserId(familyId, currentUserId)
                .orElseThrow(() -> new IllegalStateException("Not a member"));
        if (!canManageFamily(currentMember.getRole())) {
            throw new org.springframework.security.access.AccessDeniedException("Chỉ Ba mẹ mới có thể đổi quyền thành viên");
        }

        String roleValue = body.get("role");
        if (!"CAREGIVER".equals(roleValue) && !"VIEWER".equals(roleValue)) {
            throw new IllegalArgumentException("role must be CAREGIVER or VIEWER");
        }

        FamilyMember target = familyMemberRepository.findByFamilyIdAndUserId(familyId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        if (target.getUser().getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot change your own role");
        }
        if (target.getRole() == FamilyMember.Role.PARENT || target.getRole() == FamilyMember.Role.ADMIN) {
            throw new IllegalArgumentException("Cannot change parent/admin role");
        }

        target.setRole(FamilyMember.Role.valueOf(roleValue));
        familyMemberRepository.save(target);
        return ResponseEntity.ok(Map.of("role", roleValue));
    }

    private boolean canManageFamily(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.ADMIN;
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
