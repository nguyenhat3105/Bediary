package com.bediary.repository;

import com.bediary.entity.HealthSubject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthSubjectRepository extends JpaRepository<HealthSubject, UUID> {

    List<HealthSubject> findByFamilyIdOrderByCreatedAtAsc(UUID familyId);

    Optional<HealthSubject> findByIdAndFamilyId(UUID id, UUID familyId);

    void deleteByFamilyId(UUID familyId);
}
