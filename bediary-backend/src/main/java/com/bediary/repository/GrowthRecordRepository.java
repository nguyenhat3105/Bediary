package com.bediary.repository;

import com.bediary.entity.GrowthRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GrowthRecordRepository extends JpaRepository<GrowthRecord, UUID> {

    Page<GrowthRecord> findByFamilyIdOrderByRecordedAtDesc(UUID familyId, Pageable pageable);

    Optional<GrowthRecord> findFirstByFamilyIdOrderByRecordedAtDesc(UUID familyId);

    void deleteByFamilyId(UUID familyId);
}
