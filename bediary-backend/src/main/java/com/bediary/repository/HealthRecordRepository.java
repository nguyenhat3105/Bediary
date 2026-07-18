package com.bediary.repository;

import com.bediary.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface HealthRecordRepository extends JpaRepository<HealthRecord, UUID> {

    List<HealthRecord> findByFamilyIdOrderByEventDateDescCreatedAtDesc(UUID familyId);

    List<HealthRecord> findByFamilyIdAndRecordTypeOrderByEventDateDescCreatedAtDesc(UUID familyId, HealthRecord.Type recordType);

    List<HealthRecord> findByFamilyIdAndNextFollowUpDateBetweenOrderByNextFollowUpDateAsc(
            UUID familyId,
            LocalDate start,
            LocalDate end
    );

    long countByFamilyIdAndRecordType(UUID familyId, HealthRecord.Type recordType);

    void deleteByFamilyId(UUID familyId);
}
