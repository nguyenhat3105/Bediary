package com.bediary.service;

import com.bediary.dto.HealthRecordRequest;
import com.bediary.dto.HealthRecordResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.HealthRecord;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.HealthRecordRepository;
import com.bediary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HealthRecordService {

    private final HealthRecordRepository healthRecordRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<HealthRecordResponse> list(UUID familyId, HealthRecord.Type type) {
        List<HealthRecord> records = type == null
                ? healthRecordRepository.findByFamilyIdOrderByEventDateDescCreatedAtDesc(familyId)
                : healthRecordRepository.findByFamilyIdAndRecordTypeOrderByEventDateDescCreatedAtDesc(familyId, type);
        return records.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<HealthRecordResponse> upcoming(UUID familyId, int days) {
        LocalDate today = LocalDate.now();
        return healthRecordRepository
                .findByFamilyIdAndNextFollowUpDateBetweenOrderByNextFollowUpDateAsc(familyId, today, today.plusDays(days))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public HealthRecordResponse create(HealthRecordRequest request, UUID userId, UUID familyId) {
        requireWriter(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        HealthRecord record = new HealthRecord();
        record.setFamily(family);
        record.setCreatedBy(user);
        apply(record, request);
        return toResponse(healthRecordRepository.save(record));
    }

    @Transactional
    public HealthRecordResponse update(UUID id, HealthRecordRequest request, UUID userId, UUID familyId) {
        requireWriter(userId, familyId);
        HealthRecord record = getForFamily(id, familyId);
        apply(record, request);
        return toResponse(healthRecordRepository.save(record));
    }

    @Transactional
    public void delete(UUID id, UUID userId, UUID familyId) {
        requireWriter(userId, familyId);
        healthRecordRepository.delete(getForFamily(id, familyId));
    }

    private void apply(HealthRecord record, HealthRecordRequest request) {
        record.setRecordType(request.recordType());
        record.setTitle(request.title().trim());
        record.setEventDate(request.eventDate());
        record.setNextFollowUpDate(request.nextFollowUpDate());
        record.setFacility(clean(request.facility()));
        record.setDoctorName(clean(request.doctorName()));
        record.setDiagnosis(clean(request.diagnosis()));
        record.setMedicationName(clean(request.medicationName()));
        record.setMedicationDosage(clean(request.medicationDosage()));
        record.setMedicationStatus(request.medicationStatus());
        record.setHereditarySide(request.hereditarySide());
        record.setSeverity(request.severity());
        record.setNotes(clean(request.notes()));
    }

    private HealthRecord getForFamily(UUID id, UUID familyId) {
        HealthRecord record = healthRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Health record not found"));
        if (!record.getFamily().getId().equals(familyId)) {
            throw new AccessDeniedException("Health record does not belong to this family");
        }
        return record;
    }

    private void requireWriter(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("Tài khoản này chỉ có quyền xem sổ sức khỏe");
        }
    }

    private String clean(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private HealthRecordResponse toResponse(HealthRecord record) {
        return new HealthRecordResponse(
                record.getId(),
                record.getRecordType(),
                record.getTitle(),
                record.getEventDate(),
                record.getNextFollowUpDate(),
                record.getFacility(),
                record.getDoctorName(),
                record.getDiagnosis(),
                record.getMedicationName(),
                record.getMedicationDosage(),
                record.getMedicationStatus(),
                record.getHereditarySide(),
                record.getSeverity(),
                record.getNotes(),
                record.getCreatedBy().getFullName(),
                record.getCreatedAt()
        );
    }
}
