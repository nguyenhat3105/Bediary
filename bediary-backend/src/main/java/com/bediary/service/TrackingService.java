package com.bediary.service;

import com.bediary.dto.TrackingLogRequest;
import com.bediary.dto.TrackingLogResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.TrackingLog;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.TrackingLogRepository;
import com.bediary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrackingService {

    private final TrackingLogRepository trackingLogRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;
    private final StreakService streakService;

    @Transactional
    public TrackingLogResponse logActivity(TrackingLogRequest request, UUID userId, UUID familyId) {
        ensureCanWrite(familyId, userId);

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        TrackingLog log = TrackingLog.builder()
                .family(family)
                .createdBy(user)
                .activityType(request.activityType())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .metadata(request.metadata())
                .build();

        TrackingLog saved = trackingLogRepository.save(log);
        streakService.updateStreak(familyId);
        return toResponse(saved);
    }

    @Transactional
    public TrackingLogResponse updateActivity(UUID logId, TrackingLogRequest request, UUID userId, UUID familyId) {
        ensureCanWrite(familyId, userId);

        TrackingLog log = trackingLogRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Tracking log not found"));
        if (!log.getFamily().getId().equals(familyId)) {
            throw new AccessDeniedException("Tracking log does not belong to this family");
        }

        log.setActivityType(request.activityType());
        log.setStartTime(request.startTime());
        log.setEndTime(request.endTime());
        log.setMetadata(request.metadata());

        return toResponse(trackingLogRepository.save(log));
    }

    @Transactional(readOnly = true)
    public List<TrackingLogResponse> getDailyLogs(LocalDate date, UUID familyId) {
        ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant startOfDay = date.atStartOfDay(vietnamZone).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(vietnamZone).toInstant();

        return trackingLogRepository
                .findDailyLogs(familyId, startOfDay, endOfDay)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void ensureCanWrite(UUID familyId, UUID userId) {
        FamilyMember membership = familyMemberRepository
                .findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this family"));
        if (membership.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("VIEWER role is not allowed to write tracking activities.");
        }
    }

    private TrackingLogResponse toResponse(TrackingLog log) {
        return new TrackingLogResponse(
                log.getId(),
                log.getActivityType(),
                log.getStartTime(),
                log.getEndTime(),
                log.getMetadata(),
                log.getCreatedBy().getFullName()
        );
    }
}