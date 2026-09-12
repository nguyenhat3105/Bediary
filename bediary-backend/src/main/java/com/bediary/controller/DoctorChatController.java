package com.bediary.controller;

import com.bediary.dto.DoctorChatMessageRequest;
import com.bediary.dto.DoctorChatMessageResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.DoctorChatService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/doctor-chat")
@RequiredArgsConstructor
public class DoctorChatController {

    private final DoctorChatService doctorChatService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @GetMapping("/messages")
    public ResponseEntity<List<DoctorChatMessageResponse>> getMessages(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(doctorChatService.getMessages(familyId, userId));
    }

    @PostMapping("/messages")
    public ResponseEntity<DoctorChatMessageResponse> sendMessage(
            @Valid @RequestBody DoctorChatMessageRequest request,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(doctorChatService.sendMessage(familyId, userId, request));
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
