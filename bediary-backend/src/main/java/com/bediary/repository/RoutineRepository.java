package com.bediary.repository;

import com.bediary.entity.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    List<Routine> findByFamilyIdAndIsActiveTrue(UUID familyId);

    void deleteByFamilyId(UUID familyId);
}
