package com.bediary.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.Locale;

@Service
public class AiIntentService {

    public AiIntent detect(String question) {
        String q = normalize(question);
        if (containsAny(q, "tiem", "vac xin", "vaccine", "mui tiem", "chung ngua")) return AiIntent.VACCINATION;
        if (containsAny(q, "can nang", "chieu cao", "tang truong", "z score", "percentile", "who", "suy dinh duong", "thua can")) return AiIntent.GROWTH;
        if (containsAny(q, "thuoc", "don thuoc", "benh", "di ung", "sot", "ho", "kham", "chan doan", "xet nghiem", "suc khoe")) return AiIntent.HEALTH;
        if (containsAny(q, "bu", "sua", "an", "dam", "dinh duong", "ml", "chao", "thuc an", "binh sua")) return AiIntent.NUTRITION;
        if (containsAny(q, "ngu", "lich sinh hoat", "routine", "di tieu", "di ngoai", "di tieu", "ta", "thay ta", "tam", "hoat dong")) return AiIntent.ROUTINE;
        return AiIntent.GENERAL;
    }

    public String instruction(AiIntent intent) {
        return switch (intent) {
            case NUTRITION -> "Trọng tâm: dinh dưỡng, bú/ăn, tổng ml, số bữa, phản ứng với thức ăn. Nếu thiếu tuổi/cân nặng/lượng bú, nói rõ dữ liệu còn thiếu.";
            case ROUTINE -> "Trọng tâm: lịch sinh hoạt trong ngày, giấc ngủ, số lần đi tiểu/đi tiêu, nhịp bú/ăn, điểm lệch so với nếp sinh hoạt.";
            case GROWTH -> "Trọng tâm: cân nặng, chiều cao, z-score/percentile nếu có, xu hướng tăng trưởng. Không kết luận bệnh, chỉ gợi ý theo dõi.";
            case HEALTH -> "Trọng tâm: sổ sức khỏe, thuốc đang dùng, dị ứng, bệnh lý, lịch khám. Không kê thuốc, không đổi liều, nhắc kiểm tra với bác sĩ.";
            case VACCINATION -> "Trọng tâm: lịch tiêm, mũi sắp tới/quá hạn/đã tiêm, phân loại bắt buộc/khuyến nghị nếu dữ liệu có.";
            case GENERAL -> "Trọng tâm: trả lời đúng câu hỏi bằng dữ liệu hiện có, tránh lan man và nêu rõ dữ liệu nào đang thiếu.";
        };
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) return true;
        }
        return false;
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT);
    }
}
