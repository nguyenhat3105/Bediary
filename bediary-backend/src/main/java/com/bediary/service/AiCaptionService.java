package com.bediary.service;

import com.bediary.dto.AiChatRequest;
import com.bediary.dto.AiChatResponse;
import com.bediary.entity.Family;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.MediaPostRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiCaptionService {
    private static final Logger log = LoggerFactory.getLogger(AiCaptionService.class);
    private static final String SAFETY_NOTE = "Thông tin AI chỉ mang tính tham khảo, không thay thế bác sĩ nhi khoa. Nếu bé sốt cao, khó thở, tím tái, co giật, bỏ bú, li bì, mất nước, nôn liên tục, tiêu chảy nhiều hoặc có dấu hiệu bất thường, hãy liên hệ cơ sở y tế ngay.";
    private static final String SINH_HOAT_RESOURCE = "ai/sinhhoat.md";

    private final RestClient restClient;
    private final FamilyRepository familyRepository;
    private final MediaPostRepository mediaPostRepository;
    private final ObjectMapper objectMapper;
    private final AiKnowledgeService aiKnowledgeService;
    private final AiContextBuilderService aiContextBuilderService;
    private final AiIntentService aiIntentService;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.api-url}")
    private String groqApiUrl;

    @Value("${groq.vision-model}")
    private String visionModel;

    @Value("${groq.chat-model:${groq.vision-model}}")
    private String chatModel;

    @Transactional
    public List<String> generateCaptions(String imageUrl, UUID postId, UUID userId) {
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
                "model", visionModel,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(textContent, imageContent)
                )),
                "temperature", 0.7,
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

        AiIntent intent = aiIntentService.detect(request.question());
        String babyContext = buildBabyContext(family);
        String answerPolicy = buildAnswerPolicy()
                + "\n" + buildPrecisionPolicy()
                + "\n" + buildPediatricSafetyPolicy(family);
        String guideline = "Intent: " + intent.name() + "\n"
                + aiIntentService.instruction(intent) + "\n\n"
                + answerPolicy + "\n\n"
                + aiContextBuilderService.build(family) + "\n\n"
                + buildCareGuideline(family);
        String extraContext = StringUtils.hasText(request.context())
                ? "\n\nDữ liệu ứng dụng đã tóm tắt:\n" + request.context().trim()
                : "";
        String reviewedKnowledge = aiKnowledgeService.retrieveRelevantContext(family, request.question(), request.context());
        String knowledgeContext = StringUtils.hasText(reviewedKnowledge)
                ? "\n\nTài liệu tri thức đã được duyệt lâm sàng liên quan:\n" + reviewedKnowledge
                : "";
        String relaxedClinicalPolicy = """

                Quy tắc ưu tiên mới để trả lời sát hơn:
                - Không trả lời kiểu quá phòng thủ. Được phép nhận xét rõ: điểm nào ổn, điểm nào lệch, mức độ đáng chú ý thấp/vừa/cao.
                - Được phép nói "có thể liên quan đến..." hoặc "nên ưu tiên kiểm tra..." khi dữ liệu gợi ý một khả năng hợp lý.
                - Không cần lặp lại nhiều lần rằng AI không thay thế bác sĩ. Chỉ nhắc đi khám khi có dấu hiệu đỏ hoặc dữ liệu cho thấy rủi ro đáng kể.
                - Nếu dữ liệu app ít, vẫn phải nhận xét trên dữ liệu đang có, rồi nói chính xác cần nhập thêm mục nào để đánh giá chắc hơn.
                - Câu hỏi trực tiếp của ba mẹ luôn quan trọng hơn context trang hiện tại. Nếu ba mẹ hỏi về "bé nóng", "sốt", "biếng ăn", "bú kém", "bỏ bú", "mệt", "quấy", phải trả lời triệu chứng đó trước; không mở bài bằng cân nặng/chiều cao/tăng trưởng trừ khi câu hỏi yêu cầu.
                - Với câu "bé đang nóng, biếng ăn": phải nói ngay cần đo nhiệt độ bằng nhiệt kế, ghi số độ và thời điểm; kiểm tra bé uống/bú được bao nhiêu; đếm số lần đi tiểu trong 6-12 giờ; quan sát tỉnh táo, môi/miệng khô, nôn, tiêu chảy, phát ban hoặc khó thở.
                - Nếu chưa có số đo nhiệt độ, không gọi chắc là sốt; hãy nói "bé đang nóng/chưa rõ có sốt thật hay không". Nếu có sốt hoặc ăn/bú giảm rõ, ưu tiên theo dõi sát hơn trong ngày.
                - Với câu hỏi về nhật ký hôm nay, hãy đưa nhận xét như một người đồng hành chăm bé: cụ thể, thẳng, có thứ tự ưu tiên, tránh giáo điều.
                - Không dùng cụm chung chung như "theo dõi thêm", "ăn uống đầy đủ", "sinh hoạt hợp lý" nếu không nêu rõ theo dõi gì, trong bao lâu, và ngưỡng nào đáng lo.
                - Kết luận nên có màu sắc đánh giá: "hôm nay dữ liệu nghiêng về thiếu thông tin bú", "đi tiêu/đi tiểu cần ưu tiên kiểm tra", "giấc ngủ đang ghi nhận hơi ít".
                """;
        String systemPrompt = "Bạn là trợ lý chăm sóc em bé của ứng dụng Bediary. " +
                "Trả lời bằng tiếng Việt, rõ ràng, thực tế, không phóng đại. " +
                "Chỉ đưa khuyến nghị chăm sóc phổ thông dựa trên dữ liệu được cung cấp và tài liệu tham khảo. " +
                "Không chẩn đoán bệnh, không kê thuốc, không đưa liều thuốc, không thay thế bác sĩ. " +
                "Nếu dữ liệu thiếu, hãy nói rõ thiếu dữ liệu nào thay vì suy đoán. " +
                "Nếu có dấu hiệu đỏ như sốt cao, khó thở, tím tái, co giật, bỏ bú, li bì, mất nước, nôn liên tục, tiêu chảy nhiều, hoặc trẻ dưới 3 tháng bị sốt, phải khuyên đi khám ngay. " +
                "Không nhận dạng khuôn mặt, danh tính hoặc suy luận thông tin nhạy cảm về trẻ. " +
                "Định dạng bắt buộc: 1. Kết luận ngắn; 2. Dữ liệu đáng chú ý; 3. Việc nên làm ngay hôm nay; 4. Khi cần hỏi bác sĩ/đi khám. " +
                relaxedClinicalPolicy;

        String userPrompt = "Câu hỏi của ba mẹ cần trả lời trực tiếp trước: " + request.question().trim()
                + "\n\n" + babyContext
                + "\n\n" + guideline + knowledgeContext + relaxedClinicalPolicy + extraContext;

        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.35,
                "max_tokens", 1100
        );

        try {
            String rawResponse = callGroq(requestBody);
            return new AiChatResponse(extractAssistantText(rawResponse), null);
        } catch (Exception e) {
            log.error("Groq chat call failed: {}", e.getMessage());
            return new AiChatResponse(
                    "Mình chưa kết nối được AI lúc này. Ba mẹ có thể thử lại sau ít phút. Nếu câu hỏi liên quan dấu hiệu bất thường của bé, hãy ưu tiên hỏi bác sĩ hoặc cơ sở y tế gần nhất.",
                    SAFETY_NOTE
            );
        }
    }

    private String buildBabyContext(Family family) {
        LocalDate dob = family.getBabyDob();
        Period age = Period.between(dob, LocalDate.now());
        long ageDays = ChronoUnit.DAYS.between(dob, LocalDate.now());
        return "Thông tin bé: biệt danh " + family.getBabyName() +
                ", ngày sinh " + dob +
                ", giới tính " + (family.getBabyGender() != null ? family.getBabyGender().name() : "chưa rõ") +
                ", khoảng " + age.getYears() + " tuổi " + age.getMonths() + " tháng " + age.getDays() + " ngày" +
                " (" + ageDays + " ngày tuổi).";
    }

    private String buildAnswerPolicy() {
        return """
                Quy tắc trả lời ưu tiên, bắt buộc tuân thủ:
                - Bám sát dữ liệu trong app; mỗi nhận xét chính phải nhắc số liệu cụ thể nếu dữ liệu có sẵn.
                - Phân biệt rõ "app ghi nhận" với "thực tế cả ngày"; nếu app chỉ có ít hoạt động, nói dữ liệu có thể chưa nhập đủ, không kết luận chắc chắn.
                - Nếu có ghi chú tiêu chảy, nước tiểu vàng đậm, bỏ bú, sốt, nôn, li bì, khó thở hoặc dấu hiệu mất nước, ưu tiên phân tích dấu hiệu đó trước các điểm đang ổn.
                - Không trả lời chung chung kiểu "theo dõi thêm" nếu không nói rõ theo dõi gì: số cữ bú, tổng ml, số tã ướt, màu nước tiểu, số lần tiêu chảy, nhiệt độ, mức tỉnh táo.
                - Không dùng câu khẳng định quá mức như "nằm trong bình thường" khi dữ liệu app chưa đủ cả ngày.
                - Trả lời dưới 350 từ, tiếng Việt tự nhiên, không lan man.
                - Định dạng nên dùng:
                  1. Kết luận ngắn
                  2. Dữ liệu đáng chú ý
                  3. Việc nên làm ngay hôm nay
                  4. Khi cần hỏi bác sĩ/đi khám
                """;
    }

    private String buildPediatricSafetyPolicy(Family family) {
        long ageDays = ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now());
        boolean underSixMonths = ageDays < 180;
        String hydrationAdvice = underSixMonths
                ? "- Với bé dưới 6 tháng, không khuyên tự cho uống nước; hãy nói ưu tiên bú sữa mẹ/sữa công thức đủ cữ, trừ khi bác sĩ có chỉ định khác."
                : "- Với bé từ 6 tháng trở lên, có thể nhắc bổ sung nước phù hợp tuổi khi tiêu chảy, nhưng vẫn ưu tiên hỏi bác sĩ nếu có dấu hiệu mất nước.";
        return """
                Quy tắc an toàn nhi khoa bổ sung:
                %s
                - Nếu chỉ có dữ liệu "nước tiểu vàng đậm", không tự suy diễn bệnh đường tiết niệu. Hãy diễn đạt an toàn hơn: có thể liên quan thiếu dịch/cô đặc nước tiểu, cần theo dõi số tã ướt, màu nước tiểu, mùi bất thường, sốt, quấy khóc và tổng lượng bú.
                - Nếu tổng ml hiện tại bằng hoặc gần bằng trung bình 7 ngày, không nói "thấp hơn trung bình"; hãy nói dữ liệu 7 ngày cũng có thể chưa nhập đủ nếu số ml/ngày quá thấp.
                - Khi nói về tiêu chảy, cần hỏi/nhắc theo dõi số lần đi tiêu, phân có máu/nhầy không, nôn không, sốt không, bé có tỉnh táo và bú được không.
                - Hành động khuyến nghị phải cụ thể: ghi thêm cữ bú còn thiếu, đo nhiệt độ, đếm tã ướt trong 6-12 giờ, quan sát môi/miệng khô, mắt trũng, mức tỉnh táo.
                """.formatted(hydrationAdvice);
    }

    private String buildPrecisionPolicy() {
        return """
                Hợp đồng phân tích sát dữ liệu:
                - Trước khi đưa lời khuyên, phải đọc đủ các nhóm dữ liệu app có: bú/ăn, ngủ, đi tiểu, đi tiêu, ghi chú bất thường, xu hướng 7 ngày, tăng trưởng, tiêm chủng, sổ sức khỏe.
                - Nếu câu hỏi hỏi "nhận xét hôm nay", phần "Dữ liệu đáng chú ý" phải nhắc ít nhất 3 số liệu cụ thể đang có, ví dụ: số cữ bú và tổng ml, số giấc ngủ và tổng phút, số lần tã/đi tiêu, ghi chú tiêu chảy hoặc nước tiểu vàng đậm.
                - Mỗi gợi ý phải gắn với một dữ liệu: "vì app mới ghi nhận 1 cữ/152 ml nên...", "vì có ghi chú tiêu chảy nên...", "vì nước tiểu vàng đậm nên...".
                - Không được dùng câu rỗng như "theo dõi chặt chẽ", "ăn uống đầy đủ", "sinh hoạt hợp lý" nếu không kèm chỉ số cần theo dõi và khung thời gian.
                - Khi so sánh với xu hướng 7 ngày, phải so sánh toán học đúng: bằng nhau thì nói "tương đương dữ liệu 7 ngày", lớn hơn thì nói "cao hơn", thấp hơn thì nói "thấp hơn".
                - Nếu dữ liệu 7 ngày cũng rất ít, phải nói rõ "có thể cả 7 ngày chưa được nhập đủ" thay vì xem đó là chuẩn của bé.
                - Nếu có mâu thuẫn giữa "đi tiểu nhiều" trong ghi chú và số lần app ghi nhận thấp, phải nói rõ: ghi chú mô tả đi tiểu nhiều nhưng app chỉ có N lần ghi nhận, cần nhập/kiểm tra lại số tã thực tế.
                - Kết luận ngắn phải là 1-2 câu có trọng tâm, không mở đầu bằng câu chung chung kiểu "không thể kết luận chắc chắn".
                """;
    }

    private String buildCareGuideline(Family family) {
        long ageDays = ChronoUnit.DAYS.between(family.getBabyDob(), LocalDate.now());
        String fallback = buildFallbackGuideline(ageDays);
        try {
            String document = new ClassPathResource(SINH_HOAT_RESOURCE).getContentAsString(StandardCharsets.UTF_8);
            String broad = selectBroadSection(document, ageDays);
            String monthly = selectMonthlySection(document, ageDays);
            String combined = (broad + "\n\n" + monthly).trim();
            if (!combined.isBlank()) {
                return "Tài liệu tham khảo nội bộ về sinh hoạt/sức khỏe theo tuổi:\n" + limitText(combined, 7000);
            }
        } catch (Exception e) {
            log.warn("Could not load AI care guideline resource {}: {}", SINH_HOAT_RESOURCE, e.getMessage());
        }
        return fallback;
    }

    private String buildFallbackGuideline(long ageDays) {
        if (ageDays < 90) {
            return "Khung tham khảo theo tuổi: bé dưới 3 tháng cần ưu tiên bú đủ, ngủ an toàn, theo dõi sốt rất thận trọng. Nếu có sốt, bỏ bú, khó thở, li bì hoặc ít tã ướt, nên đi khám sớm.";
        }
        if (ageDays < 180) {
            return "Khung tham khảo theo tuổi: bé 3-6 tháng thường cần lịch ngủ/bú đều, theo dõi tăng trưởng và số tã ướt. Chưa nên khuyến nghị ăn dặm nếu chưa đủ điều kiện phát triển.";
        }
        if (ageDays < 365) {
            return "Khung tham khảo theo tuổi: bé 6-12 tháng có thể ăn dặm phù hợp độ tuổi bên cạnh sữa, cần theo dõi phản ứng với thức ăn mới, giấc ngủ, đi ngoài và tăng trưởng.";
        }
        if (ageDays < 730) {
            return "Khung tham khảo theo tuổi: bé 1-2 tuổi cần nếp ăn-ngủ ổn định, vận động an toàn, theo dõi tăng trưởng, ngôn ngữ, tiêm chủng và dấu hiệu mất nước/sốt kéo dài.";
        }
        return "Khung tham khảo theo tuổi: trẻ trên 2 tuổi cần lịch sinh hoạt nhất quán, dinh dưỡng đa dạng, vận động, ngủ đủ và theo dõi các dấu hiệu bệnh kéo dài hoặc bất thường.";
    }

    private String selectBroadSection(String document, long ageDays) {
        if (ageDays < 180) {
            return sectionBetween(document, "Chăm sóc toàn diện cho trẻ từ 0 - 6 tháng tuổi", "Chế độ dinh dưỡng và sinh hoạt cho trẻ từ 6 - 12 tháng tuổi");
        }
        if (ageDays < 365) {
            return sectionBetween(document, "Chế độ dinh dưỡng và sinh hoạt cho trẻ từ 6 - 12 tháng tuổi", "Chăm sóc và phát triển cho trẻ từ 12 - 36 tháng tuổi");
        }
        if (ageDays < 1095) {
            return sectionBetween(document, "Chăm sóc và phát triển cho trẻ từ 12 - 36 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 1 tháng tuổi");
        }
        return "";
    }

    private String selectMonthlySection(String document, long ageDays) {
        int month = Math.max(1, Math.min(12, (int) Math.ceil(Math.max(ageDays, 1) / 30.4375)));
        return switch (month) {
            case 1 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 1 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 2 tháng tuổi");
            case 2 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 2 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 3 tháng tuổi");
            case 3 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 3 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 4 tháng tuổi");
            case 4 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 4 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 5 tháng tuổi");
            case 5 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 5 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 6 tháng tuổi");
            case 6 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 6 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 7 - 8 tháng tuổi");
            case 7, 8 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 7 - 8 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 9 - 10 tháng tuổi");
            case 9, 10 -> sectionBetween(document, "Hướng dẫn chăm sóc sức khỏe trẻ 9 - 10 tháng tuổi", "Hướng dẫn chăm sóc sức khỏe trẻ 11 - 12 tháng tuổi");
            case 11, 12 -> sectionFrom(document, "Hướng dẫn chăm sóc sức khỏe trẻ 11 - 12 tháng tuổi");
            default -> "";
        };
    }

    private String sectionBetween(String document, String startMarker, String endMarker) {
        int start = document.indexOf(startMarker);
        if (start < 0) return "";
        int end = document.indexOf(endMarker, start + startMarker.length());
        if (end < 0) return document.substring(start).trim();
        return document.substring(start, end).trim();
    }

    private String sectionFrom(String document, String startMarker) {
        int start = document.indexOf(startMarker);
        return start < 0 ? "" : document.substring(start).trim();
    }

    private String limitText(String text, int maxChars) {
        if (text.length() <= maxChars) return text;
        return text.substring(0, maxChars) + "\n...[đã rút gọn tài liệu theo giới hạn prompt]";
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

