package com.bediary.service;

import com.bediary.dto.GrowthRecordRequest;
import com.bediary.dto.GrowthRecordResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import com.bediary.util.WhoGrowthUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GrowthService {

    private final GrowthRecordRepository growthRecordRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final WhoGrowthUtil whoGrowthUtil;

    @Transactional
    public GrowthRecordResponse recordGrowth(GrowthRecordRequest request,
                                              UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("VIEWER role cannot record growth data");
        }

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        int ageDays = (int) ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now());
        String gender = family.getBabyGender() != null ? family.getBabyGender().name() : "MALE";

        String weightStatus = whoGrowthUtil.assessWeight(ageDays, request.weightKg(), gender);
        String heightStatus = whoGrowthUtil.assessHeight(ageDays, request.heightCm(), gender);

        GrowthRecord record = GrowthRecord.builder()
                .family(family)
                .recordedBy(user)
                .recordedAt(Instant.now())
                .weightKg(request.weightKg())
                .heightCm(request.heightCm())
                .ageDays(ageDays)
                .weightStatus(weightStatus)
                .heightStatus(heightStatus)
                .build();

        return toResponse(growthRecordRepository.save(record));
    }

    @Transactional(readOnly = true)
    public List<GrowthRecordResponse> getHistory(UUID familyId, int page, int size) {
        return growthRecordRepository
                .findByFamilyIdOrderByRecordedAtDesc(familyId, PageRequest.of(page, size))
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public GrowthRecordResponse getLatest(UUID familyId) {
        return growthRecordRepository.findFirstByFamilyIdOrderByRecordedAtDesc(familyId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("No growth records found"));
    }

    private GrowthRecordResponse toResponse(GrowthRecord r) {
        String statusText = whoGrowthUtil.getStatusText(r.getWeightStatus(), r.getHeightStatus());
        String suggestion = buildSuggestion(r.getWeightStatus(), r.getHeightStatus());
        return new GrowthRecordResponse(
                r.getId(),
                r.getAgeDays(),
                r.getWeightKg(),
                r.getHeightCm(),
                r.getWeightStatus(),
                r.getHeightStatus(),
                statusText,
                suggestion,
                r.getRecordedAt()
        );
    }

    private String buildSuggestion(String weightStatus, String heightStatus) {
        if ("SEVERELY_UNDERWEIGHT".equals(weightStatus)) {
            return "Bé cần được thăm khám bác sĩ ngay để được tư vấn dinh dưỡng.";
        }
        if ("UNDERWEIGHT".equals(weightStatus)) {
            return "Tăng cường cho bé bú hoặc ăn dặm theo độ tuổi. Theo dõi cân nặng hàng tuần.";
        }
        if ("OVERWEIGHT".equals(weightStatus)) {
            return "Kiểm soát khẩu phần ăn và tăng cường vận động phù hợp lứa tuổi.";
        }
        if ("SHORT".equals(heightStatus)) {
            return "Đảm bảo bé ngủ đủ giấc và bổ sung đủ canxi, vitamin D.";
        }
        return "Tiếp tục duy trì chế độ dinh dưỡng và sinh hoạt hiện tại!";
    }
}
