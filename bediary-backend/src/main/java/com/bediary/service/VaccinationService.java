package com.bediary.service;

import com.bediary.dto.VaccinationRecordRequest;
import com.bediary.dto.VaccinationRecordResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public VaccinationRecordResponse createRecord(VaccinationRecordRequest request,
                                                   UUID userId, UUID familyId) {
        requireAdmin(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        VaccinationRecord record = VaccinationRecord.builder()
                .family(family)
                .vaccineName(request.vaccineName())
                .doseNumber(request.doseNumber() > 0 ? request.doseNumber() : 1)
                .scheduledDate(request.scheduledDate())
                .notes(request.notes())
                .build();

        return toResponse(vaccinationRecordRepository.save(record));
    }

    @Transactional(readOnly = true)
    public List<VaccinationRecordResponse> listRecords(UUID familyId) {
        return vaccinationRecordRepository
                .findByFamilyIdOrderByScheduledDateAsc(familyId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public VaccinationRecordResponse completeVaccination(UUID recordId, UUID userId, UUID familyId) {
        requireAdmin(userId, familyId);
        VaccinationRecord record = getRecordForFamily(recordId, familyId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        record.setCompletedAt(Instant.now());
        record.setCompletedBy(user);
        return toResponse(vaccinationRecordRepository.save(record));
    }

    @Transactional
    public void deleteRecord(UUID recordId, UUID userId, UUID familyId) {
        requireAdmin(userId, familyId);
        VaccinationRecord record = getRecordForFamily(recordId, familyId);
        vaccinationRecordRepository.delete(record);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void requireAdmin(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("VIEWER role cannot modify vaccination records");
        }
    }

    private VaccinationRecord getRecordForFamily(UUID recordId, UUID familyId) {
        VaccinationRecord record = vaccinationRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Vaccination record not found"));
        if (!record.getFamily().getId().equals(familyId)) {
            throw new AccessDeniedException("Access denied to this record");
        }
        return record;
    }

    private VaccinationRecordResponse toResponse(VaccinationRecord r) {
        boolean overdue = r.getCompletedAt() == null
                && r.getScheduledDate().isBefore(LocalDate.now());
        return new VaccinationRecordResponse(
                r.getId(),
                r.getVaccineName(),
                r.getDoseNumber(),
                r.getScheduledDate(),
                r.getCompletedAt(),
                r.getNotes(),
                overdue,
                r.getCreatedAt()
        );
    }
}
