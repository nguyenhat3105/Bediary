package com.bediary.controller;

import com.bediary.dto.HealthRecordRequest;
import com.bediary.dto.HealthRecordResponse;
import com.bediary.dto.HealthRecordImportResponse;
import com.bediary.entity.HealthRecord;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.HealthRecordImportService;
import com.bediary.service.HealthRecordService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/health-records")
@RequiredArgsConstructor
public class HealthRecordController {

    private final HealthRecordService healthRecordService;
    private final HealthRecordImportService healthRecordImportService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @GetMapping
    public ResponseEntity<List<HealthRecordResponse>> list(
            @RequestParam(required = false) HealthRecord.Type type,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthRecordService.list(familyId, type));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<HealthRecordResponse>> upcoming(
            @RequestParam(defaultValue = "60") int days,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        int safeDays = Math.max(1, Math.min(days, 365));
        return ResponseEntity.ok(healthRecordService.upcoming(familyId, safeDays));
    }

    @PostMapping
    public ResponseEntity<HealthRecordResponse> create(
            @Valid @RequestBody HealthRecordRequest body,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthRecordService.create(body, userId, familyId));
    }

    @PostMapping(value = "/import/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<HealthRecordImportResponse> analyzeImport(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthRecordImportService.analyze(file, userId, familyId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HealthRecordResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody HealthRecordRequest body,
            HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(healthRecordService.update(id, body, userId, familyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
        String token = extractToken(request);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        healthRecordService.delete(id, userId, familyId);
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
