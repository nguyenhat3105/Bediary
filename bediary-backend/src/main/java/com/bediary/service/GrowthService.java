package com.bediary.service;

import com.bediary.dto.GrowthRecordRequest;
import com.bediary.dto.GrowthRecordResponse;
import com.bediary.dto.NutritionSuggestionResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import com.bediary.util.WhoGrowthUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GrowthService {

    private final GrowthRecordRepository growthRecordRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final TrackingLogRepository trackingLogRepository;
    private final WhoGrowthUtil whoGrowthUtil;

    public GrowthService(GrowthRecordRepository growthRecordRepository,
                          FamilyRepository familyRepository,
                          FamilyMemberRepository familyMemberRepository,
                          UserRepository userRepository,
                          TrackingLogRepository trackingLogRepository,
                          WhoGrowthUtil whoGrowthUtil) {
        this.growthRecordRepository = growthRecordRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.userRepository = userRepository;
        this.trackingLogRepository = trackingLogRepository;
        this.whoGrowthUtil = whoGrowthUtil;
    }

    @Transactional
    public GrowthRecordResponse recordGrowth(GrowthRecordRequest request,
                                              UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (!canManageMedicalData(member.getRole())) {
            throw new AccessDeniedException("Ch? ba m? m?i c? th? ghi d? li?u t?ng tr??ng");
        }

        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        int ageDays = (int) ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now());
        String gender = family.getBabyGender() != null ? family.getBabyGender().name() : "MALE";

        WhoGrowthUtil.Assessment weightAssessment = whoGrowthUtil.assessWeight(ageDays, request.weightKg(), gender);
        WhoGrowthUtil.Assessment heightAssessment = whoGrowthUtil.assessHeight(ageDays, request.heightCm(), gender);

        GrowthRecord record = GrowthRecord.builder()
                .family(family)
                .recordedBy(user)
                .recordedAt(Instant.now())
                .weightKg(request.weightKg())
                .heightCm(request.heightCm())
                .ageDays(ageDays)
                .weightStatus(weightAssessment.status())
                .heightStatus(heightAssessment.status())
                .weightZScore(request.weightKg() != null ? weightAssessment.zScore() : null)
                .heightZScore(request.heightCm() != null ? heightAssessment.zScore() : null)
                .weightPercentile(request.weightKg() != null ? weightAssessment.percentile() : null)
                .heightPercentile(request.heightCm() != null ? heightAssessment.percentile() : null)
                .growthSource(weightAssessment.source())
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

    @Transactional(readOnly = true)
    public NutritionSuggestionResponse getNutritionSuggestions(UUID familyId) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));
        GrowthRecord latest = growthRecordRepository.findFirstByFamilyIdOrderByRecordedAtDesc(familyId).orElse(null);

        int ageDays = family.getBabyDob() != null
                ? (int) ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now())
                : 0;
        int ageMonths = Math.max(0, ageDays / 30);
        List<TrackingLog> logs = trackingLogRepository.findRecentLogs(familyId, Instant.now().minus(7, ChronoUnit.DAYS));
        long feedCount = logs.stream().filter(log -> "FEED".equalsIgnoreCase(log.getActivityType())).count();
        long sleepCount = logs.stream().filter(log -> "SLEEP".equalsIgnoreCase(log.getActivityType())).count();

        List<NutritionSuggestionResponse.NutritionItem> items = new java.util.ArrayList<>();
        String weightStatus = latest != null ? latest.getWeightStatus() : "NORMAL";
        String heightStatus = latest != null ? latest.getHeightStatus() : "NORMAL";

        if ("SEVERELY_UNDERWEIGHT".equals(weightStatus) || "UNDERWEIGHT".equals(weightStatus)) {
            add(items, "Sữa mẹ / sữa công thức", "milk", "Năng lượng", "Ưu tiên đảm bảo lượng sữa theo tuổi vì bé đang nhẹ cân theo chuẩn WHO.", "Chia đều trong ngày, theo hướng dẫn bác sĩ nếu bé dưới 12 tháng.", "HIGH");
            if (ageMonths >= 6) {
                add(items, "Cháo thịt cá", "fish", "Đạm", "Bổ sung đạm chất lượng tốt để hỗ trợ tăng cân và phục hồi mô.", "Nấu mềm, tăng dần độ thô theo khả năng ăn dặm.", "HIGH");
                add(items, "Trứng", "egg", "Đạm", "Giàu đạm và vi chất, phù hợp khi bé đã ăn dặm và không dị ứng.", "Bắt đầu lượng nhỏ, dùng chín kỹ.", "MEDIUM");
            }
        } else if ("OVERWEIGHT".equals(weightStatus)) {
            add(items, "Rau xanh", "greens", "Chất xơ", "Tăng chất xơ giúp bữa ăn no hơn nhưng không quá dư năng lượng.", "Hấp/luộc mềm, không ép ăn quá mức.", "HIGH");
            add(items, "Trái cây ít ngọt", "apple", "Vitamin", "Thay thế bánh kẹo/nước ép bằng trái cây nguyên miếng phù hợp tuổi.", "Ưu tiên miếng mềm, tránh nước ép đóng chai.", "HIGH");
            add(items, "Đạm nạc", "chicken", "Đạm", "Giữ đủ đạm để phát triển nhưng hạn chế món chiên, nhiều dầu.", "Luộc/hấp/kho nhạt, khẩu phần theo tuổi.", "MEDIUM");
        }

        if ("SHORT".equals(heightStatus)) {
            add(items, "Sữa chua", "yogurt", "Canxi", "Hỗ trợ canxi và năng lượng, phù hợp khi bé đã dùng được sản phẩm sữa.", "Chọn loại ít đường, lượng phù hợp tuổi.", "HIGH");
            add(items, "Cá biển", "fish", "Vitamin D", "Cung cấp đạm, chất béo tốt và vi chất liên quan tăng trưởng.", "Gỡ xương kỹ, dùng lượng nhỏ trước.", "MEDIUM");
            add(items, "Đậu hũ / đậu", "beans", "Đạm thực vật", "Bổ sung đạm và khoáng chất cho chế độ ăn đa dạng.", "Nấu mềm, theo dõi đầy hơi.", "MEDIUM");
        }

        if (items.isEmpty()) {
            add(items, "Bữa ăn đa dạng", "plate", "Cân bằng", "Chỉ số hiện trong vùng chuẩn, ưu tiên duy trì đủ nhóm tinh bột, đạm, rau quả và chất béo tốt.", "Đổi món theo ngày, không cần bổ sung quá mức.", "HIGH");
            add(items, "Rau xanh", "greens", "Chất xơ", "Giúp tiêu hóa tốt và tạo thói quen ăn đa dạng.", "Nấu mềm, phối hợp với món bé thích.", "MEDIUM");
            add(items, "Trái cây", "banana", "Vitamin", "Bổ sung vitamin và năng lượng tự nhiên.", "Dùng lượng vừa phải, ưu tiên trái cây nguyên miếng.", "MEDIUM");
        }

        if (feedCount < 10) {
            add(items, "Ghi nhật ký bữa ăn", "note", "Theo dõi", "Dữ liệu ăn/bú 7 ngày còn ít nên hệ thống chưa đánh giá khẩu phần chính xác.", "Ghi món ăn, lượng sữa ml hoặc khẩu phần mỗi bữa.", "HIGH");
        }
        if (sleepCount < 7 && ("SHORT".equals(heightStatus) || latest == null)) {
            add(items, "Theo dõi giấc ngủ", "sleep", "Sinh hoạt", "Giấc ngủ ảnh hưởng tăng trưởng, đặc biệt khi cần theo dõi chiều cao.", "Ghi giờ ngủ/ngủ dậy hằng ngày.", "MEDIUM");
        }

        return new NutritionSuggestionResponse(
                buildNutritionBasis(latest, ageMonths, feedCount, sleepCount),
                items.stream().limit(6).toList()
        );
    }

    private GrowthRecordResponse toResponse(GrowthRecord r) {
        String statusText = whoGrowthUtil.getStatusText(r.getWeightStatus(), r.getHeightStatus());
        String suggestion = makeSuggestionParentFriendly(buildSuggestion(r));
        return new GrowthRecordResponse(
                r.getId(),
                r.getAgeDays(),
                r.getWeightKg(),
                r.getHeightCm(),
                r.getWeightStatus(),
                r.getHeightStatus(),
                r.getWeightZScore(),
                r.getHeightZScore(),
                r.getWeightPercentile(),
                r.getHeightPercentile(),
                r.getGrowthSource(),
                statusText,
                suggestion,
                r.getRecordedAt()
        );
    }

    private String makeSuggestionParentFriendly(String suggestion) {
        if (suggestion == null || suggestion.isBlank()) return suggestion;
        return suggestion
                .replace("dưới -3SD theo WHO", "thấp hơn nhiều so với vùng thường gặp theo chuẩn WHO")
                .replace("dưới -2SD", "thấp hơn vùng thường gặp theo tuổi")
                .replace("trên +2SD theo tuổi", "cao hơn vùng thường gặp theo tuổi")
                .replace("trên +2SD", "cao hơn đa số bé cùng tuổi")
                .replace("-3SD", "mức rất thấp so với chuẩn")
                .replace("-2SD", "thấp hơn vùng thường gặp")
                .replace("+2SD", "cao hơn vùng thường gặp");
    }

    private void add(List<NutritionSuggestionResponse.NutritionItem> items,
                     String name,
                     String iconKey,
                     String category,
                     String reason,
                     String servingNote,
                     String priority) {
        boolean exists = items.stream().anyMatch(item -> item.name().equalsIgnoreCase(name));
        if (!exists) {
            items.add(new NutritionSuggestionResponse.NutritionItem(name, iconKey, category, reason, servingNote, priority));
        }
    }

    private String buildNutritionBasis(GrowthRecord latest, int ageMonths, long feedCount, long sleepCount) {
        if (latest == null) {
            return "Gợi ý theo tuổi " + ageMonths + " tháng và dữ liệu nhật ký hiện có. Hãy cập nhật cân nặng/chiều cao để cá nhân hóa tốt hơn.";
        }
        return "Dựa trên tuổi " + ageMonths + " tháng, trạng thái WHO mới nhất, "
                + feedCount + " nhật ký ăn/bú và " + sleepCount + " nhật ký ngủ trong 7 ngày gần đây.";
    }

    private String buildSuggestion(GrowthRecord record) {
        StringBuilder suggestion = new StringBuilder();
        String weightStatus = record.getWeightStatus();
        String heightStatus = record.getHeightStatus();

        if ("SEVERELY_UNDERWEIGHT".equals(weightStatus)) {
            suggestion.append("Cân nặng đang dưới -3SD theo WHO. Nên đưa bé đi khám dinh dưỡng/nhi khoa sớm để được đánh giá nguyên nhân và khẩu phần phù hợp. ");
        } else if ("UNDERWEIGHT".equals(weightStatus)) {
            suggestion.append("Cân nặng đang dưới -2SD. Theo dõi lượng bú/ăn dặm, số bữa trong ngày và cân lại sau 2-4 tuần. ");
        } else if ("OVERWEIGHT".equals(weightStatus)) {
            suggestion.append("Cân nặng đang trên +2SD theo tuổi. Không tự ý ăn kiêng; nên rà soát khẩu phần, đồ ngọt/nước ép và tăng vận động phù hợp tuổi. ");
        }

        if ("SHORT".equals(heightStatus)) {
            suggestion.append("Chiều cao đang dưới -2SD. Cần kiểm tra giấc ngủ, vitamin D, canxi trong khẩu phần và trao đổi bác sĩ nếu xu hướng thấp kéo dài. ");
        } else if ("TALL".equals(heightStatus)) {
            suggestion.append("Chiều cao trên +2SD; thường có thể là biến thể gia đình, nhưng nên theo dõi tốc độ tăng trưởng qua các lần đo. ");
        }

        suggestion.append(buildTrendSuggestion(record));
        suggestion.append(buildTrackingSuggestion(record.getFamily().getId()));

        if (suggestion.isEmpty()) {
            return "Chỉ số hiện trong vùng chuẩn WHO. Tiếp tục duy trì lịch ăn, ngủ, vận động đều và đo lại định kỳ mỗi 2-4 tuần.";
        }
        return suggestion.toString().trim();
    }

    private String buildTrendSuggestion(GrowthRecord current) {
        List<GrowthRecord> recent = growthRecordRepository
                .findByFamilyIdOrderByRecordedAtDesc(current.getFamily().getId(), PageRequest.of(0, 4))
                .stream()
                .filter(r -> !r.getId().equals(current.getId()))
                .toList();
        if (recent.isEmpty()) return "";

        GrowthRecord previous = recent.get(0);
        StringBuilder text = new StringBuilder();
        if (current.getWeightKg() != null && previous.getWeightKg() != null) {
            double delta = current.getWeightKg().subtract(previous.getWeightKg()).doubleValue();
            if (delta < -0.2) {
                text.append("Cân nặng giảm so với lần đo trước; nên kiểm tra bé có giảm ăn, bệnh gần đây hoặc rối loạn tiêu hóa không. ");
            } else if (delta > 1.5) {
                text.append("Cân nặng tăng nhanh so với lần đo trước; nên xem lại năng lượng khẩu phần và tần suất ăn vặt. ");
            }
        }
        if (current.getHeightCm() != null && previous.getHeightCm() != null) {
            double delta = current.getHeightCm().subtract(previous.getHeightCm()).doubleValue();
            if (delta < -0.5) {
                text.append("Chiều cao thấp hơn lần đo trước, có thể do sai số đo; nên đo lại cùng tư thế và cùng thời điểm. ");
            }
        }
        return text.toString();
    }

    private String buildTrackingSuggestion(UUID familyId) {
        List<TrackingLog> logs = trackingLogRepository.findRecentLogs(familyId, Instant.now().minus(7, ChronoUnit.DAYS));
        if (logs.isEmpty()) {
            return "Chưa có đủ dữ liệu nhật ký 7 ngày gần đây; nhập thêm bữa ăn, bú, ngủ để gợi ý chính xác hơn.";
        }

        long feedCount = logs.stream().filter(log -> "FEED".equalsIgnoreCase(log.getActivityType())).count();
        long sleepCount = logs.stream().filter(log -> "SLEEP".equalsIgnoreCase(log.getActivityType())).count();
        double milkMl = logs.stream()
                .filter(log -> "FEED".equalsIgnoreCase(log.getActivityType()))
                .map(TrackingLog::getMetadata)
                .filter(metadata -> metadata != null)
                .mapToDouble(this::extractMilkMl)
                .sum();

        StringBuilder text = new StringBuilder();
        if (feedCount < 14) {
            text.append("Nhật ký ăn/bú 7 ngày gần đây còn ít, nên ghi đều hơn để đánh giá khẩu phần. ");
        }
        if (sleepCount < 7) {
            text.append("Dữ liệu ngủ còn ít; giấc ngủ là yếu tố quan trọng cho tăng trưởng chiều cao. ");
        }
        if (milkMl > 0) {
            text.append("Tổng lượng sữa đã ghi trong 7 ngày gần nhất khoảng ").append(Math.round(milkMl)).append(" ml; hãy so sánh với nhu cầu theo tuổi và hướng dẫn bác sĩ. ");
        }
        return text.toString();
    }

    private double extractMilkMl(Map<String, Object> metadata) {
        for (String key : List.of("milkMl", "amountMl", "ml", "volumeMl")) {
            Object value = metadata.get(key);
            if (value instanceof Number number) return number.doubleValue();
            if (value instanceof String text) {
                try {
                    return Double.parseDouble(text);
                } catch (NumberFormatException ignored) {
                    // Continue checking other keys.
                }
            }
        }
        return 0;
    }

    private boolean canManageMedicalData(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.ADMIN;
    }
}
