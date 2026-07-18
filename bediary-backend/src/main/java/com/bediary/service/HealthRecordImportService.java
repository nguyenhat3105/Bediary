package com.bediary.service;

import com.bediary.dto.HealthRecordImportResponse;
import com.bediary.dto.HealthRecordRequest;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.HealthRecord;
import com.bediary.repository.FamilyMemberRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HealthRecordImportService {
    private static final Logger log = LoggerFactory.getLogger(HealthRecordImportService.class);
    private static final long MAX_IMPORT_BYTES = 10L * 1024 * 1024;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final FamilyMemberRepository familyMemberRepository;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.api-url}")
    private String groqApiUrl;

    @Value("${groq.vision-model}")
    private String visionModel;

    @Value("${groq.chat-model:${groq.vision-model}}")
    private String chatModel;

    public HealthRecordImportResponse analyze(MultipartFile file, UUID userId, UUID familyId) {
        requireWriter(userId, familyId);
        validate(file);

        try {
            String contentType = file.getContentType() == null ? "" : file.getContentType();
            String rawResponse = contentType.equalsIgnoreCase(MediaType.APPLICATION_PDF_VALUE)
                    ? analyzePdf(file)
                    : analyzeImage(file);
            return parseImportResponse(rawResponse);
        } catch (Exception e) {
            log.error("Health record import failed: {}", e.getMessage(), e);
            return importFailedResponse(readableImportError(e));
        }
    }

    private HealthRecordImportResponse importFailedResponse(String message) {
        return new HealthRecordImportResponse(
                List.of(),
                "",
                List.of(
                        message,
                        "Tài liệu chưa được lưu vào sổ sức khỏe. Bạn có thể thử ảnh rõ hơn, chọn PDF có text, hoặc nhập tay."
                )
        );
    }

    private String readableImportError(Exception e) {
        String message = e.getMessage();
        if (!StringUtils.hasText(message)) {
            return "Không thể đọc tài liệu sức khỏe lúc này.";
        }
        if (message.contains("GROQ_API_KEY")) {
            return "Backend chưa cấu hình API key AI nên chưa thể import tự động.";
        }
        if (message.contains("PDF scan")) {
            return "PDF dạng scan chưa có text. Hãy chụp/trích xuất từng trang thành ảnh rõ nét rồi import lại.";
        }
        if (message.contains("401") || message.contains("Unauthorized")) {
            return "API key AI không hợp lệ hoặc đã hết quyền truy cập.";
        }
        if (message.contains("400") || message.contains("Bad Request")) {
            return "AI chưa đọc được file này. Hãy thử ảnh rõ hơn, ít nghiêng, đủ sáng và không bị cắt mép.";
        }
        return "Không thể đọc tài liệu sức khỏe. Vui lòng thử ảnh rõ hơn hoặc nhập tay.";
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh hoặc PDF giấy khám/đơn thuốc.");
        }
        if (file.getSize() > MAX_IMPORT_BYTES) {
            throw new IllegalArgumentException("File tối đa 10MB.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!contentType.startsWith("image/") && !contentType.equalsIgnoreCase(MediaType.APPLICATION_PDF_VALUE)) {
            throw new IllegalArgumentException("Chỉ hỗ trợ ảnh JPG/PNG/WebP hoặc PDF.");
        }
    }

    private String analyzeImage(MultipartFile file) throws IOException {
        String dataUrl = "data:" + file.getContentType() + ";base64," + Base64.getEncoder().encodeToString(file.getBytes());
        Map<String, Object> textContent = Map.of("type", "text", "text", importPrompt(null));
        Map<String, Object> imageContent = Map.of("type", "image_url", "image_url", Map.of("url", dataUrl));
        Map<String, Object> requestBody = Map.of(
                "model", visionModel,
                "messages", List.of(Map.of("role", "user", "content", List.of(textContent, imageContent))),
                "temperature", 0.1,
                "max_tokens", 1800
        );
        return callGroq(requestBody);
    }

    private String analyzePdf(MultipartFile file) throws IOException {
        String text;
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            text = new PDFTextStripper().getText(document);
        }
        if (!StringUtils.hasText(text)) {
            throw new IllegalArgumentException("PDF scan không có text. Vui lòng chụp/trích xuất từng trang thành ảnh để import.");
        }
        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "messages", List.of(Map.of("role", "user", "content", importPrompt(text))),
                "temperature", 0.1,
                "max_tokens", 1800
        );
        return callGroq(requestBody);
    }

    private String importPrompt(String extractedPdfText) {
        String source = StringUtils.hasText(extractedPdfText)
                ? "\n\nNội dung PDF đã trích xuất:\n" + limit(extractedPdfText, 9000)
                : "";
        return """
                Bạn là trợ lý nhập liệu cho sổ sức khỏe trẻ em.
                Hãy OCR/đọc giấy khám, kết quả khám hoặc đơn thuốc, rồi bóc tách thành dữ liệu có cấu trúc.
                Không chẩn đoán, không tự thêm thuốc/liều nếu tài liệu không ghi rõ.
                Nếu không chắc, để trống trường đó và thêm cảnh báo.

                Chỉ trả về JSON hợp lệ, không markdown, theo schema:
                {
                  "extractedText": "văn bản đọc được ngắn gọn",
                  "warnings": ["điểm cần phụ huynh kiểm tra lại"],
                  "records": [
                    {
                      "recordType": "CHECKUP | CONDITION | HEREDITARY | MEDICATION | ALLERGY | NOTE",
                      "title": "tiêu đề ngắn",
                      "eventDate": "yyyy-MM-dd hoặc null",
                      "nextFollowUpDate": "yyyy-MM-dd hoặc null",
                      "facility": "cơ sở y tế hoặc null",
                      "doctorName": "tên bác sĩ hoặc null",
                      "diagnosis": "chẩn đoán/tình trạng hoặc null",
                      "medicationName": "tên thuốc hoặc null",
                      "medicationDosage": "liều dùng/cách dùng hoặc null",
                      "medicationStatus": "ACTIVE | PAUSED | COMPLETED hoặc null",
                      "hereditarySide": "MATERNAL | PATERNAL | BOTH | UNKNOWN hoặc null",
                      "severity": "LOW | MEDIUM | HIGH hoặc null",
                      "notes": "ghi chú, lời dặn, kết quả xét nghiệm hoặc null"
                    }
                  ]
                }

                Quy tắc:
                - Một lần khám nên tạo 1 record CHECKUP.
                - Mỗi thuốc trong đơn nên tạo 1 record MEDICATION riêng nếu đọc được tên thuốc.
                - Dị ứng thuốc/thức ăn tạo ALLERGY.
                - Ngày không chắc thì null.
                - Luôn thêm cảnh báo kiểm tra lại tên thuốc và liều dùng nếu có thuốc.
                """ + source;
    }

    private HealthRecordImportResponse parseImportResponse(String rawResponse) throws Exception {
        String content = extractAssistantText(rawResponse);
        JsonNode root = objectMapper.readTree(extractJsonObject(content));
        List<String> warnings = new ArrayList<>();
        root.path("warnings").forEach(node -> warnings.add(node.asText()));

        List<HealthRecordRequest> records = new ArrayList<>();
        root.path("records").forEach(node -> {
            HealthRecordRequest request = toRequest(node);
            if (request != null) records.add(request);
        });

        if (records.isEmpty()) {
            warnings.add("AI chưa bóc tách được hồ sơ nào. Phụ huynh nên nhập tay hoặc thử ảnh rõ hơn.");
        }
        if (warnings.isEmpty()) {
            warnings.add("Vui lòng kiểm tra lại toàn bộ thông tin trước khi lưu, đặc biệt tên thuốc và liều dùng.");
        }
        return new HealthRecordImportResponse(records, root.path("extractedText").asText(""), warnings);
    }

    private HealthRecordRequest toRequest(JsonNode node) {
        HealthRecord.Type type = enumValue(HealthRecord.Type.class, node.path("recordType").asText(), HealthRecord.Type.NOTE);
        String title = clean(node.path("title").asText(null));
        if (!StringUtils.hasText(title)) {
            title = switch (type) {
                case CHECKUP -> "Lần khám sức khỏe";
                case MEDICATION -> "Thuốc từ đơn khám";
                case ALLERGY -> "Dị ứng cần lưu ý";
                case CONDITION -> "Tình trạng sức khỏe";
                case HEREDITARY -> "Thông tin di truyền";
                case NOTE -> "Ghi chú sức khỏe";
            };
        }
        return new HealthRecordRequest(
                type,
                title,
                localDate(node.path("eventDate").asText(null)),
                localDate(node.path("nextFollowUpDate").asText(null)),
                clean(node.path("facility").asText(null)),
                clean(node.path("doctorName").asText(null)),
                clean(node.path("diagnosis").asText(null)),
                clean(node.path("medicationName").asText(null)),
                clean(node.path("medicationDosage").asText(null)),
                enumValue(HealthRecord.MedicationStatus.class, node.path("medicationStatus").asText(), null),
                enumValue(HealthRecord.HereditarySide.class, node.path("hereditarySide").asText(), HealthRecord.HereditarySide.UNKNOWN),
                enumValue(HealthRecord.Severity.class, node.path("severity").asText(), HealthRecord.Severity.LOW),
                clean(node.path("notes").asText(null))
        );
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

    private String extractAssistantText(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        return root.path("choices").get(0).path("message").path("content").asText().trim();
    }

    private String extractJsonObject(String value) {
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) return value.substring(start, end + 1);
        return value;
    }

    private LocalDate localDate(String value) {
        try {
            return StringUtils.hasText(value) && !"null".equalsIgnoreCase(value) ? LocalDate.parse(value) : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String clean(String value) {
        if (!StringUtils.hasText(value) || "null".equalsIgnoreCase(value)) return null;
        return value.trim();
    }

    private <T extends Enum<T>> T enumValue(Class<T> type, String value, T fallback) {
        try {
            return StringUtils.hasText(value) && !"null".equalsIgnoreCase(value) ? Enum.valueOf(type, value.trim()) : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String limit(String text, int maxChars) {
        return text.length() <= maxChars ? text : text.substring(0, maxChars);
    }

    private void requireWriter(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("Tài khoản này chỉ có quyền xem sổ sức khỏe");
        }
    }
}
