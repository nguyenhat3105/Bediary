package com.bediary.repository;

import com.bediary.entity.DoctorChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorChatMessageRepository extends JpaRepository<DoctorChatMessage, UUID> {
    List<DoctorChatMessage> findTop80ByFamilyIdOrderByCreatedAtAsc(UUID familyId);
}
