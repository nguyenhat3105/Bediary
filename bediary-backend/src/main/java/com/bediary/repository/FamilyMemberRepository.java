package com.bediary.repository;

import com.bediary.entity.FamilyMember;
import com.bediary.entity.FamilyMember.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, UUID> {

    Optional<FamilyMember> findByFamilyIdAndUserId(UUID familyId, UUID userId);

    boolean existsByFamilyIdAndUserId(UUID familyId, UUID userId);

    Optional<FamilyMember> findByUserIdAndFamilyId(UUID userId, UUID familyId);

    List<FamilyMember> findByFamilyId(UUID familyId);

    void deleteByFamilyId(UUID familyId);

    /**
     * Find the first family membership for a user — used to resolve primary family.
     */
    Optional<FamilyMember> findFirstByUserId(UUID userId);
}
