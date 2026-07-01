package com.bediary.scheduler;

import com.bediary.entity.Family;
import com.bediary.entity.UserStreak;
import com.bediary.entity.VaccinationRecord;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.UserStreakRepository;
import com.bediary.repository.VaccinationRecordRepository;
import com.bediary.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DailyScheduler {
    private static final Logger log = LoggerFactory.getLogger(DailyScheduler.class);

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final UserStreakRepository userStreakRepository;
    private final NotificationService notificationService;

    /**
     * Runs every day at 08:00 AM.
     *
     * For each family:
     * 1. Check vaccinations due within the next 7 days → create VACCINATION notification
     * 2. Check streaks → if lastActivityDate < yesterday → reset to 0
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void runDailyTasks() {
        log.info("DailyScheduler: starting daily tasks at {}", LocalDate.now());

        List<Family> allFamilies = familyRepository.findAll();

        for (Family family : allFamilies) {
            try {
                processVaccinationReminders(family);
                processStreakReset(family);
            } catch (Exception e) {
                log.error("DailyScheduler: error processing family {}: {}", family.getId(), e.getMessage());
            }
        }

        log.info("DailyScheduler: completed daily tasks for {} families", allFamilies.size());
    }

    // ── Vaccination reminders ─────────────────────────────────────────────────

    private void processVaccinationReminders(Family family) {
        LocalDate today = LocalDate.now();
        LocalDate in7Days = today.plusDays(7);

        List<VaccinationRecord> upcoming = vaccinationRecordRepository
                .findByFamilyIdAndCompletedAtIsNullAndScheduledDateBetween(
                        family.getId(), today, in7Days);

        for (VaccinationRecord record : upcoming) {
            // Notify all ADMIN members of the family
            familyMemberRepository.findByFamilyId(family.getId()).forEach(member -> {
                if (member.getRole().name().equals("ADMIN")) {
                    long daysUntil = today.until(record.getScheduledDate(),
                            java.time.temporal.ChronoUnit.DAYS);
                    String title = "💉 Nhắc nhở tiêm phòng";
                    String body  = String.format(
                            "Bé cần tiêm \"%s\" (mũi %d) trong %d ngày nữa (%s)",
                            record.getVaccineName(),
                            record.getDoseNumber(),
                            daysUntil,
                            record.getScheduledDate()
                    );
                    notificationService.createNotification(
                            family.getId(),
                            member.getUser().getId(),
                            "VACCINATION",
                            title,
                            body,
                            Map.of("vaccinationId", record.getId().toString(),
                                    "scheduledDate", record.getScheduledDate().toString())
                    );
                }
            });
        }
    }

    // ── Streak reset ─────────────────────────────────────────────────────────

    private void processStreakReset(Family family) {
        userStreakRepository.findByFamilyId(family.getId()).ifPresent(streak -> {
            LocalDate today     = LocalDate.now();
            LocalDate lastDate  = streak.getLastActivityDate();

            // If last activity was before yesterday → reset streak
            if (lastDate != null && lastDate.isBefore(today.minusDays(1))) {
                log.debug("Resetting streak for family {}. Last activity: {}", family.getId(), lastDate);
                streak.setCurrentStreak(0);
                userStreakRepository.save(streak);
            }
        });
    }
}
