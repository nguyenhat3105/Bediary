package com.bediary.repository;

import com.bediary.entity.UserStreak;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserStreakRepository extends JpaRepository<UserStreak, UUID> {

    Optional<UserStreak> findByFamilyId(UUID familyId);

    void deleteByFamilyId(UUID familyId);
}
