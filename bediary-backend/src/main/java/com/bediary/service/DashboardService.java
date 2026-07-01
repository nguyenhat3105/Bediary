package com.bediary.service;

import com.bediary.dto.*;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final FamilyRepository familyRepository;
    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final CareTipRepository careTipRepository;
    private final MediaPostRepository mediaPostRepository;
    private final RoutineRepository routineRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final StreakService streakService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(UUID userId, UUID familyId) {

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // ── Baby age calculation ─────────────────────────────────────────
        LocalDate today = LocalDate.now();
        LocalDate dob = family.getBabyDob();
        long totalDays = ChronoUnit.DAYS.between(dob, today);
        long years  = totalDays / 365;
        long months = (totalDays % 365) / 30;
        long days   = (totalDays % 365) % 30;
        String ageText = years + " tuổi " + months + " tháng " + days + " ngày";

        // ── Upcoming vaccinations (next 30 days) ─────────────────────────
        LocalDate in30Days = today.plusDays(30);
        List<VaccinationRecord> upcoming = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(
                        familyId, today, in30Days);

        List<DashboardResponse.VaccinationSummary> vacSummaries = upcoming.stream()
                .map(v -> new DashboardResponse.VaccinationSummary(
                        v.getId(),
                        v.getVaccineName(),
                        v.getDoseNumber(),
                        v.getScheduledDate(),
                        v.getScheduledDate().isBefore(today)
                ))
                .toList();

        // ── Today's care tips ────────────────────────────────────────────
        int ageDays = (int) totalDays;
        List<CareTip> allTips = careTipRepository
                .findByStartDayLessThanEqualAndEndDayGreaterThanEqual(ageDays, ageDays);

        boolean isPremium = Boolean.TRUE.equals(user.getIsPremium());
        List<CareTipResponse> tipResponses = allTips.stream()
                .filter(t -> !t.isPremium() || isPremium)
                .map(t -> new CareTipResponse(
                        t.getId(), t.getCategory(), t.getTitle(),
                        t.getContent(), t.getSourceType(), t.isPremium()))
                .toList();

        // ── Latest 3 media posts ─────────────────────────────────────────
        List<MediaPostResponse> latestPosts = mediaPostRepository
                .findByFamilyIdOrderByCreatedAtDesc(familyId,
                        org.springframework.data.domain.PageRequest.of(0, 3))
                .stream()
                .map(this::toPostResponse)
                .toList();

        // ── Streak ──────────────────────────────────────────────────────
        StreakResponse streak = streakService.getStreak(familyId);

        // ── Growth reminder (last record > 30 days ago) ──────────────────
        boolean growthReminder = growthRecordRepository
                .findFirstByFamilyIdOrderByRecordedAtDesc(familyId)
                .map(r -> r.getRecordedAt().isBefore(
                        today.minusDays(30).atStartOfDay(java.time.ZoneOffset.UTC).toInstant()))
                .orElse(true);

        // ── Today's active routines ──────────────────────────────────────
        List<RoutineResponse> todayRoutines = routineRepository
                .findByFamilyIdAndIsActiveTrue(familyId)
                .stream()
                .map(r -> new RoutineResponse(
                        r.getId(), r.getLabel(), r.getActivityType(),
                        r.getScheduledTime(), r.isActive(), r.getCreatedAt()))
                .toList();

        return new DashboardResponse(
                family.getBabyName(),
                family.getBabyDob(),
                family.getBabyName(),
                ageText,
                totalDays,
                vacSummaries,
                tipResponses,
                latestPosts,
                streak,
                growthReminder,
                todayRoutines
        );
    }

    private MediaPostResponse toPostResponse(MediaPost p) {
        return new MediaPostResponse(
                p.getId(),
                p.getMediaUrl(),
                p.getMediaType(),
                p.getCaption(),
                p.getUploadedBy().getFullName(),
                p.getCreatedAt()
        );
    }
}
