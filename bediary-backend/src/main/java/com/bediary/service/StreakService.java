package com.bediary.service;

import com.bediary.dto.StreakResponse;
import com.bediary.entity.Family;
import com.bediary.entity.UserStreak;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.UserStreakRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StreakService {
    private static final Logger log = LoggerFactory.getLogger(StreakService.class);

    private final UserStreakRepository userStreakRepository;
    private final FamilyRepository familyRepository;

    @Transactional(readOnly = true)
    public StreakResponse getStreak(UUID familyId) {
        return userStreakRepository.findByFamilyId(familyId)
                .map(s -> new StreakResponse(s.getCurrentStreak(), s.getLongestStreak(),
                        s.getLastActivityDate()))
                .orElse(new StreakResponse(0, 0, null));
    }

    /**
     * Called whenever a user logs an activity or uploads a photo.
     * Logic:
     *   - Same day → no change
     *   - Yesterday → increment streak
     *   - Gap > 1 day → reset to 1
     */
    @Transactional
    public void updateStreak(UUID familyId) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        UserStreak streak = userStreakRepository.findByFamilyId(familyId)
                .orElse(UserStreak.builder().family(family).build());

        LocalDate today = LocalDate.now();
        LocalDate lastDate = streak.getLastActivityDate();

        if (lastDate == null) {
            streak.setCurrentStreak(1);
        } else if (lastDate.equals(today)) {
            // Already counted today — no change
            return;
        } else if (lastDate.equals(today.minusDays(1))) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        } else {
            // Broke the streak
            log.debug("Streak broken for family {}. Last activity was {}", familyId, lastDate);
            streak.setCurrentStreak(1);
        }

        streak.setLastActivityDate(today);
        if (streak.getCurrentStreak() > streak.getLongestStreak()) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }

        userStreakRepository.save(streak);
    }

    /**
     * Reset streak to 0 when called by scheduler after an inactive day.
     */
    @Transactional
    public void resetStreak(UUID familyId) {
        userStreakRepository.findByFamilyId(familyId).ifPresent(streak -> {
            streak.setCurrentStreak(0);
            userStreakRepository.save(streak);
        });
    }
}
