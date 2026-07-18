package com.bediary.service;

import com.bediary.dto.VaccinationRecordRequest;
import com.bediary.dto.VaccinationRecordResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VaccinationService {

    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public VaccinationRecordResponse createRecord(VaccinationRecordRequest request, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        VaccinationRecord record = VaccinationRecord.builder()
                .family(family)
                .scheduleKey(request.scheduleKey())
                .vaccineName(request.vaccineName())
                .doseNumber(request.doseNumber() > 0 ? request.doseNumber() : 1)
                .scheduledDate(request.scheduledDate())
                .category(normalizeCategory(request.category()))
                .ageLabel(request.ageLabel())
                .notes(request.notes())
                .build();

        return toResponse(vaccinationRecordRepository.save(record));
    }

    @Transactional(readOnly = true)
    public List<VaccinationRecordResponse> listRecords(UUID familyId) {
        return vaccinationRecordRepository.findByFamilyIdOrderByScheduledDateAsc(familyId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public VaccinationRecordResponse completeVaccination(UUID recordId, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        VaccinationRecord record = getRecordForFamily(recordId, familyId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        record.setCompletedAt(Instant.now());
        record.setCompletedBy(user);
        return toResponse(vaccinationRecordRepository.save(record));
    }

    @Transactional
    public VaccinationRecordResponse uncompleteVaccination(UUID recordId, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        VaccinationRecord record = getRecordForFamily(recordId, familyId);
        record.setCompletedAt(null);
        record.setCompletedBy(null);
        return toResponse(vaccinationRecordRepository.save(record));
    }

    @Transactional
    public void deleteRecord(UUID recordId, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        VaccinationRecord record = getRecordForFamily(recordId, familyId);
        vaccinationRecordRepository.delete(record);
    }

    private void requireParentManager(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (!canManageMedicalData(member.getRole())) {
            throw new AccessDeniedException("Ch? ba m? m?i c? th? qu?n l? l?ch ti?m ch?ng");
        }
    }


    private boolean canManageMedicalData(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.ADMIN;
    }

    private VaccinationRecord getRecordForFamily(UUID recordId, UUID familyId) {
        VaccinationRecord record = vaccinationRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Vaccination record not found"));
        if (!record.getFamily().getId().equals(familyId)) {
            throw new AccessDeniedException("Access denied to this record");
        }
        return record;
    }

    private String normalizeCategory(String value) {
        if (!StringUtils.hasText(value)) return "OPTIONAL";
        return "REQUIRED".equalsIgnoreCase(value) ? "REQUIRED" : "OPTIONAL";
    }

    private VaccinationRecordResponse toResponse(VaccinationRecord r) {
        boolean overdue = r.getCompletedAt() == null && r.getScheduledDate().isBefore(LocalDate.now());
        return new VaccinationRecordResponse(
                r.getId(),
                r.getScheduleKey(),
                r.getVaccineName(),
                r.getDoseNumber(),
                r.getScheduledDate(),
                r.getCategory(),
                r.getAgeLabel(),
                r.getCompletedAt(),
                r.getNotes(),
                overdue,
                r.getCreatedAt()
        );
    }
}
