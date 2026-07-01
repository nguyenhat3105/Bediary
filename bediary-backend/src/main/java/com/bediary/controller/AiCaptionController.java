package com.bediary.controller;

import com.bediary.dto.AiChatRequest;
import com.bediary.dto.AiChatResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.AiCaptionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiCaptionController {

    private final AiCaptionService aiCaptionService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @PostMapping("/caption")
    public ResponseEntity<Map<String, List<String>>> generateCaption(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);

        String imageUrl = body.get("imageUrl");
        if (!StringUtils.hasText(imageUrl)) {
            throw new IllegalArgumentException("imageUrl is required");
        }

        UUID postId = null;
        if (StringUtils.hasText(body.get("postId"))) {
            postId = UUID.fromString(body.get("postId"));
        }

        List<String> captions = aiCaptionService.generateCaptions(imageUrl, postId, userId);
        return ResponseEntity.ok(Map.of("captions", captions));
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(aiCaptionService.chatCareAssistant(request, userId, familyId));
    }

    private UUID resolveFamilyId(String token, UUID userId) {
        UUID familyId = jwtUtil.extractFamilyId(token);
        if (familyId == null) {
            familyId = familyMemberRepository.findFirstByUserId(userId)
                    .map(member -> member.getFamily().getId())
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
