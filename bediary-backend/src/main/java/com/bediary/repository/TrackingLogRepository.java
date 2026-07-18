package com.bediary.repository;

import com.bediary.entity.TrackingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface TrackingLogRepository extends JpaRepository<TrackingLog, UUID> {

    /**
     * Returns all tracking logs for a family within a time range,
     * ordered by start_time DESC for Timeline UI rendering.
     * family_id is always filtered — no cross-family data access.
     */
    @Query("SELECT t FROM TrackingLog t WHERE t.family.id = :familyId " +
           "AND t.startTime >= :startOfDay AND t.startTime < :endOfDay " +
           "ORDER BY t.startTime DESC")
    List<TrackingLog> findDailyLogs(
            @Param("familyId") UUID familyId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay);

    @Query("SELECT t FROM TrackingLog t WHERE t.family.id = :familyId " +
           "AND t.startTime >= :fromTime ORDER BY t.startTime DESC")
    List<TrackingLog> findRecentLogs(
            @Param("familyId") UUID familyId,
            @Param("fromTime") Instant fromTime);

    void deleteByFamilyId(UUID familyId);
}
