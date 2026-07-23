package com.bediary.service;

import com.bediary.dto.HealthSubjectRequest;
import com.bediary.dto.HealthSubjectResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.HealthSubject;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.HealthSubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HealthSubjectService {

    private final HealthSubjectRepository healthSubjectRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;

    @Transactional(readOnly = true)
    public List<HealthSubjectResponse> list(UUID familyId) {
        return healthSubjectRepository.findByFamilyIdOrderByCreatedAtAsc(familyId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public HealthSubjectResponse create(UUID userId, UUID familyId, HealthSubjectRequest request) {
        requireWriter(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Family not found"));

        HealthSubject subject = new HealthSubject();
        subject.setFamily(family);
        subject.setRelationship(request.relationship().trim());
        subject.setDisplayName(request.displayName() != null ? request.displayName().trim() : null);

        return toResponse(healthSubjectRepository.save(subject));
    }

    @Transactional
    public void delete(UUID userId, UUID familyId, UUID subjectId) {
        requireWriter(userId, familyId);
        HealthSubject subject = healthSubjectRepository.findByIdAndFamilyId(subjectId, familyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Health subject not found"));
        healthSubjectRepository.delete(subject);
    }

    private void requireWriter(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Viewers cannot manage health subjects");
        }
    }

    private HealthSubjectResponse toResponse(HealthSubject s) {
        return new HealthSubjectResponse(s.getId(), s.getRelationship(), s.getDisplayName(), s.getCreatedAt());
    }
}
