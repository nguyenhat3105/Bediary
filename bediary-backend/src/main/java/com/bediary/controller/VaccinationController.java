package com.bediary.controller;

import com.bediary.dto.VaccinationRecordRequest;
import com.bediary.dto.VaccinationRecordResponse;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.security.JwtUtil;
import com.bediary.service.VaccinationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/vaccinations")
@RequiredArgsConstructor
public class VaccinationController {

    private final VaccinationService vaccinationService;
    private final JwtUtil jwtUtil;
    private final FamilyMemberRepository familyMemberRepository;

    @GetMapping
    public ResponseEntity<List<VaccinationRecordResponse>> listRecords(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(vaccinationService.listRecords(familyId));
    }

    @PostMapping
    public ResponseEntity<VaccinationRecordResponse> createRecord(
            @Valid @RequestBody VaccinationRecordRequest request,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(vaccinationService.createRecord(request, userId, familyId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<VaccinationRecordResponse> completeVaccination(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(vaccinationService.completeVaccination(id, userId, familyId));
    }

    @PostMapping("/{id}/uncomplete")
    public ResponseEntity<VaccinationRecordResponse> uncompleteVaccination(
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        return ResponseEntity.ok(vaccinationService.uncompleteVaccination(id, userId, familyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecord(@PathVariable UUID id, HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        UUID userId = jwtUtil.extractUserId(token);
        UUID familyId = resolveFamilyId(token, userId);
        vaccinationService.deleteRecord(id, userId, familyId);
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