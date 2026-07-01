package com.bediary.service;

import com.bediary.dto.CareTipResponse;
import com.bediary.entity.CareTip;
import com.bediary.entity.User;
import com.bediary.repository.CareTipRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CareTipService {

    private final CareTipRepository careTipRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;

    /**
     * Returns care tips applicable for the baby's current age.
     * Premium-only tips are filtered out for non-premium users.
     */
    @Transactional(readOnly = true)
    public List<CareTipResponse> getTodayTips(UUID userId, UUID familyId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isPremium = Boolean.TRUE.equals(user.getIsPremium());

        var family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        int ageDays = (int) ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now());

        return careTipRepository
                .findByStartDayLessThanEqualAndEndDayGreaterThanEqual(ageDays, ageDays)
                .stream()
                .filter(t -> !t.isPremium() || isPremium)
                .map(this::toResponse)
                .toList();
    }

    private CareTipResponse toResponse(CareTip t) {
        return new CareTipResponse(
                t.getId(), t.getCategory(), t.getTitle(),
                t.getContent(), t.getSourceType(), t.isPremium());
    }
}
