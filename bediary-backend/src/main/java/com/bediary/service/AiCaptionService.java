package com.bediary.service;

import com.bediary.dto.AiChatRequest;
import com.bediary.dto.AiChatResponse;
import com.bediary.entity.Family;
import com.bediary.entity.MediaPost;
import com.bediary.entity.User;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.MediaPostRepository;
import com.bediary.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiCaptionService {
    private static final Logger log = LoggerFactory.getLogger(AiCaptionService.class);
    private static final String SAFETY_NOTE = "Thông tin AI chỉ mang tính tham khảo, không thay thế bác sĩ nhi khoa. Nếu bé sốt cao, khó thở, bỏ bú, lừ đừ hoặc có dấu hiệu bất thường, hãy liên hệ cơ sở y tế ngay.";

    private final RestClient restClient;
    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final MediaPostRepository mediaPostRepository;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key}")
    private String groqApiKey;

    @Value("${groq.api-url}")
    private String groqApiUrl;

    @Value("${groq.vision-model}")
    private String groqModel;

    @Transactional
    public List<String> generateCaptions(String imageUrl, UUID postId, UUID userId) {
        requirePremium(userId, "AI caption generation requires a premium account");

        Map<String, Object> textContent = Map.of(
                "type", "text",
                "text", "Hãy viết 2 caption ngắn gọn, cảm xúc bằng tiếng Việt cho bức ảnh em bé này. " +
                        "Trả về JSON array: [\"caption1\", \"caption2\"]. " +
                        "Không đề cập tên, danh tính hay nhận dạng khuôn mặt."
        );
        Map<String, Object> imageContent = Map.of(
                "type", "image_url",
                "image_url", Map.of("url", imageUrl)
        );
        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(textContent, imageContent)
                )),
                "temperature", 0.8,
                "max_tokens", 256
        );

        try {
            String rawResponse = callGroq(requestBody);
            List<String> captions = parseCaptions(rawResponse);
            if (postId != null) {
                mediaPostRepository.findById(postId).ifPresent(post -> {
                    post.setAiCaptions(captions);
                    mediaPostRepository.save(post);
                });
            }
            return captions;
        } catch (Exception e) {
            log.error("Groq caption call failed: {}", e.getMessage());
            return List.of("Khoảnh khắc đáng yêu của bé!", "Mỗi ngày là một kỷ niệm đặc biệt.");
        }
    }

    @Transactional(readOnly = true)
    public AiChatResponse chatCareAssistant(AiChatRequest request, UUID userId, UUID familyId) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        String babyContext = buildBabyContext(family);
        String extraContext = StringUtils.hasText(request.context())
                ? "\nNgữ cảnh thêm từ phụ huynh: " + request.context().trim()
                : "";

        String systemPrompt = "Bạn là trợ lí chăm sóc em bé của ứng dụng Bediary. " +
                "Trả lời bằng tiếng Việt, giọng nhẹ nhàng, thực tế, có thể gợi ý từng bước cho ba mẹ. " +
                "Không chẩn đoán bệnh, không kê thuốc, không thay thế bác sĩ. " +
                "Luôn nêu dấu hiệu cần đi khám nếu câu hỏi liên quan sức khỏe. " +
                "Không nhận dạng khuôn mặt, danh tính, hoặc suy luận thông tin nhạy cảm về trẻ.";

        String userPrompt = babyContext + extraContext + "\n\nCâu hỏi của ba mẹ: " + request.question().trim();

        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.5,
                "max_tokens", 700
        );

        try {
            String rawResponse = callGroq(requestBody);
            return new AiChatResponse(extractAssistantText(rawResponse), SAFETY_NOTE);
        } catch (Exception e) {
            log.error("Groq chat call failed: {}", e.getMessage());
            return new AiChatResponse(
                    "Mình chưa kết nối được AI lúc này. Ba mẹ có thể thử lại sau ít phút. Nếu câu hỏi liên quan dấu hiệu bất thường của bé, hãy ưu tiên hỏi bác sĩ hoặc cơ sở y tế gần nhất.",
                    SAFETY_NOTE
            );
        }
    }

    private void requirePremium(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!Boolean.TRUE.equals(user.getIsPremium())) {
            throw new AccessDeniedException(message);
        }
    }

    private String buildBabyContext(Family family) {
        LocalDate dob = family.getBabyDob();
        Period age = Period.between(dob, LocalDate.now());
        long ageDays = java.time.temporal.ChronoUnit.DAYS.between(dob, LocalDate.now());
        return "Thông tin bé trong gia đình: biệt danh " + family.getBabyName() +
                ", ngày sinh " + dob +
                ", giới tính " + (family.getBabyGender() != null ? family.getBabyGender().name() : "chưa rõ") +
                ", khoảng " + age.getYears() + " tuổi " + age.getMonths() + " tháng " + age.getDays() + " ngày" +
                " (" + ageDays + " ngày tuổi).";
    }

    private String callGroq(Map<String, Object> requestBody) {
        if (!StringUtils.hasText(groqApiKey)) {
            throw new IllegalStateException("GROQ_API_KEY is not configured");
        }
        return restClient.post()
                .uri(groqApiUrl)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);
    }

    private List<String> parseCaptions(String rawResponse) {
        try {
            String content = extractAssistantText(rawResponse);
            int start = content.indexOf('[');
            int end = content.lastIndexOf(']');
            if (start >= 0 && end > start) {
                return objectMapper.readValue(content.substring(start, end + 1), new TypeReference<List<String>>() {});
            }
            return List.of(content.trim(), "Khoảnh khắc đáng nhớ của bé.");
        } catch (Exception e) {
            log.error("Failed to parse Groq caption response: {}", e.getMessage());
            return List.of("Khoảnh khắc đáng yêu của bé!", "Mỗi ngày là một kỷ niệm đặc biệt.");
        }
    }

    private String extractAssistantText(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        return root.path("choices").get(0).path("message").path("content").asText().trim();
    }
}