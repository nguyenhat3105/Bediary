package com.bediary.repository;

import com.bediary.entity.HealthRecord;
import com.bediary.entity.HealthSubject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, UUID> {

    // ── All records (no subject filter) ──────────────────────────────────────
    List<HealthRecord> findByFamilyIdOrderByEventDateDescCreatedAtDesc(UUID familyId);

    List<HealthRecord> findByFamilyIdAndRecordTypeOrderByEventDateDescCreatedAtDesc(
            UUID familyId, HealthRecord.Type recordType);

    // ── Baby records (subject IS NULL) ───────────────────────────────────────
    List<HealthRecord> findByFamilyIdAndSubjectIsNullOrderByEventDateDescCreatedAtDesc(
            UUID familyId);

    List<HealthRecord> findByFamilyIdAndSubjectIsNullAndRecordTypeOrderByEventDateDescCreatedAtDesc(
            UUID familyId, HealthRecord.Type recordType);

    // ── Family member records (subject IS NOT NULL) ───────────────────────────
    List<HealthRecord> findByFamilyIdAndSubjectOrderByEventDateDescCreatedAtDesc(
            UUID familyId, HealthSubject subject);

    List<HealthRecord> findByFamilyIdAndSubjectAndRecordTypeOrderByEventDateDescCreatedAtDesc(
            UUID familyId, HealthSubject subject, HealthRecord.Type recordType);

    // ── Upcoming follow-ups ───────────────────────────────────────────────────
    List<HealthRecord> findByFamilyIdAndNextFollowUpDateBetweenOrderByNextFollowUpDateAsc(
            UUID familyId, LocalDate start, LocalDate end);

    long countByFamilyIdAndRecordType(UUID familyId, HealthRecord.Type recordType);

    void deleteByFamilyId(UUID familyId);
}
