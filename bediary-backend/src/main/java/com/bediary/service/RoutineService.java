package com.bediary.service;

import com.bediary.dto.RoutineLogRequest;
import com.bediary.dto.RoutineLogResponse;
import com.bediary.dto.RoutineRequest;
import com.bediary.dto.RoutineResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final RoutineLogRepository routineLogRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public RoutineResponse createRoutine(RoutineRequest request, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        Routine routine = Routine.builder()
                .family(family)
                .label(request.label())
                .activityType(request.activityType())
                .scheduledTime(request.scheduledTime())
                .build();

        return toResponse(routineRepository.save(routine));
    }

    @Transactional(readOnly = true)
    public List<RoutineResponse> getRoutines(UUID familyId) {
        return routineRepository.findByFamilyIdAndIsActiveTrue(familyId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public RoutineResponse updateRoutine(UUID routineId, RoutineRequest request, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        Routine routine = getRoutineForFamily(routineId, familyId);
        routine.setLabel(request.label());
        routine.setActivityType(request.activityType());
        routine.setScheduledTime(request.scheduledTime());
        return toResponse(routineRepository.save(routine));
    }

    @Transactional
    public void deleteRoutine(UUID routineId, UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        Routine routine = getRoutineForFamily(routineId, familyId);
        routine.setActive(false);
        routineRepository.save(routine);
    }

    @Transactional
    public RoutineLogResponse logRoutine(UUID routineId, RoutineLogRequest request,
                                         UUID userId, UUID familyId) {
        requireCareLogger(userId, familyId);
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Routine routine = routineId != null ? getRoutineForFamily(routineId, familyId) : null;

        Integer deviation = null;
        boolean correctionPrompt = false;
        if (routine != null) {
            // Convert scheduled LocalTime to minutes-of-day
            int scheduledMinutes = routine.getScheduledTime().getHour() * 60
                    + routine.getScheduledTime().getMinute();
            // Convert executedAt to local time-of-day
            LocalTime executedTime = request.executedAt()
                    .atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalTime();
            int executedMinutes = executedTime.getHour() * 60 + executedTime.getMinute();
            deviation = executedMinutes - scheduledMinutes;
            correctionPrompt = Math.abs(deviation) > 60;
        }

        RoutineLog log = RoutineLog.builder()
                .family(family)
                .routine(routine)
                .loggedBy(user)
                .executedAt(request.executedAt())
                .deviationMinutes(deviation)
                .note(request.note())
                .build();

        RoutineLog saved = routineLogRepository.save(log);

        return new RoutineLogResponse(
                saved.getId(),
                routine != null ? routine.getId() : null,
                routine != null ? routine.getLabel() : null,
                saved.getExecutedAt(),
                saved.getDeviationMinutes(),
                saved.isScheduleUpdated(),
                saved.getNote(),
                correctionPrompt
        );
    }

    @Transactional
    public RoutineResponse rescheduleRoutine(UUID routineId, LocalTime newTime,
                                              UUID userId, UUID familyId) {
        requireParentManager(userId, familyId);
        Routine routine = getRoutineForFamily(routineId, familyId);
        routine.setScheduledTime(newTime);
        return toResponse(routineRepository.save(routine));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void requireParentManager(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (!canManageRoutine(member.getRole())) {
            throw new AccessDeniedException("Ch? ba m? m?i c? th? qu?n l? l?ch sinh ho?t");
        }
    }

    private void requireCareLogger(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (!canLogRoutine(member.getRole())) {
            throw new AccessDeniedException("T?i kho?n n?y ch?a c? quy?n ghi nh?n l?ch sinh ho?t");
        }
    }

    private boolean canManageRoutine(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.ADMIN;
    }

    private boolean canLogRoutine(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.CAREGIVER || role == FamilyMember.Role.ADMIN;
    }

    private Routine getRoutineForFamily(UUID routineId, UUID familyId) {
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(() -> new IllegalArgumentException("Routine not found"));
        if (!routine.getFamily().getId().equals(familyId)) {
            throw new AccessDeniedException("Access denied to this routine");
        }
        return routine;
    }

    private RoutineResponse toResponse(Routine r) {
        return new RoutineResponse(
                r.getId(), r.getLabel(), r.getActivityType(),
                r.getScheduledTime(), r.isActive(), r.getCreatedAt());
    }
}
