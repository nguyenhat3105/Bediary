package com.bediary.repository;

import com.bediary.entity.VaccinationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface VaccinationRecordRepository extends JpaRepository<VaccinationRecord, UUID> {

    List<VaccinationRecord> findByFamilyIdOrderByScheduledDateAsc(UUID familyId);

    /** Returns incomplete vaccinations whose scheduled date has passed */
    List<VaccinationRecord> findByFamilyIdAndCompletedAtIsNullAndScheduledDateLessThanEqual(
            UUID familyId, LocalDate date);

    /** Returns incomplete vaccinations scheduled within a date range */
    List<VaccinationRecord> findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(
            UUID familyId, LocalDate from, LocalDate to);

    void deleteByFamilyId(UUID familyId);
}
