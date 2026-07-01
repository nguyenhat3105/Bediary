package com.bediary.repository;

import com.bediary.entity.RoutineLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoutineLogRepository extends JpaRepository<RoutineLog, UUID> {

    List<RoutineLog> findByFamilyIdAndExecutedAtBetween(UUID familyId, Instant from, Instant to);

    void deleteByFamilyId(UUID familyId);
}
