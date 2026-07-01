package com.bediary.controller;

import com.bediary.dto.MediaPostResponse;
import com.bediary.dto.PostCommentRequest;
import com.bediary.dto.PostCommentResponse;
import com.bediary.dto.PostReactionResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.CommentService;
import com.bediary.service.MediaService;
import com.bediary.service.ReactionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;
    private final ReactionService reactionService;
    private final CommentService commentService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    /**
     * GET /api/v1/media/feed?page=0&size=10
     * Returns paginated media feed for the caller's family.
     * SECURITY: family_id extracted from JWT (with DB fallback) — never from request param.
     */
    @GetMapping("/feed")
    public ResponseEntity<Map<String, Object>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        return ResponseEntity.ok(mediaService.getFeed(familyId, page, size));
    }

    /**
     * POST /api/v1/media/upload   (multipart/form-data)
     * Accepts an image or video file directly. Saves to local disk.
     * Returns the public URL served by /uploads/**
     *
     * Form fields:
     *   file    — required, the image/video file
     *   caption — optional text
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaPostResponse> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            HttpServletRequest httpRequest) throws Exception {

        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);

        MediaPostResponse response = mediaService.uploadMedia(file, caption, familyId, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/media/{id}/react
     * Toggles a reaction on a post. Both ADMIN and VIEWER roles allowed.
     */
    @PostMapping("/{id}/react")
    public ResponseEntity<PostReactionResponse> toggleReaction(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(reactionService.toggleReaction(id, userId, familyId));
    }

    /**
     * GET /api/v1/media/{id}/comments
     * Returns all comments on a post in chronological order. Both roles allowed.
     */
    @GetMapping("/{id}/comments")
    public ResponseEntity<List<PostCommentResponse>> getComments(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(commentService.getComments(id, familyId));
    }

    /**
     * POST /api/v1/media/{id}/comments
     * Adds a comment to a post. Both ADMIN and VIEWER roles allowed.
     */
    @PostMapping("/{id}/comments")
    public ResponseEntity<PostCommentResponse> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody PostCommentRequest request,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId  = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(commentService.addComment(id, request, userId, familyId));
    }

    /**
     * DELETE /api/v1/media/{postId}/comments/{commentId}
     * Deletes a comment. Only the comment owner or an ADMIN can delete.
     */
    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID postId,
            @PathVariable UUID commentId,
            HttpServletRequest httpRequest) {
        String token  = extractToken(httpRequest);
        UUID userId   = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        commentService.deleteComment(postId, commentId, userId, familyId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Resolve familyId from JWT. Falls back to DB if JWT was issued before family creation.
     */
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
