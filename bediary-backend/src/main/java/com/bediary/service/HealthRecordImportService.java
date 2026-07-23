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
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    @Value("${groq.vision-fallback-models:qwen/qwen3.6-27b,meta-llama/llama-4-scout-17b-16e-instruct}")
    private String visionFallbackModels;

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
        if (e instanceof RestClientResponseException responseException) {
            String body = responseException.getResponseBodyAsString();
            String detail = StringUtils.hasText(body) ? " Chi tiết: " + limit(body.replaceAll("\\s+", " "), 260) : "";
            return "AI OCR trả lỗi " + responseException.getStatusCode().value() + "." + detail;
        }
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
        ImagePayload image = normalizeImage(file);
        String dataUrl = "data:" + image.contentType() + ";base64," + Base64.getEncoder().encodeToString(image.bytes());

        String ocrText = extractTextFromImage(dataUrl);
        if (isUsefulOcrText(ocrText)) {
            return analyzeExtractedText(ocrText);
        }

        Exception lastError = null;
        for (String model : visionModels()) {
            try {
                Map<String, Object> textContent = Map.of("type", "text", "text", importPrompt(null));
                Map<String, Object> imageContent = Map.of("type", "image_url", "image_url", Map.of("url", dataUrl));
                Map<String, Object> requestBody = Map.of(
                        "model", model,
                        "messages", List.of(Map.of("role", "user", "content", List.of(textContent, imageContent))),
                        "temperature", 0.05,
                        "max_tokens", 2200
                );
                return callGroq(requestBody);
            } catch (Exception e) {
                lastError = e;
                log.warn("Health import direct vision parse failed with model {}: {}", model, e.getMessage());
            }
        }
        if (lastError != null) throw new IllegalStateException("Vision models failed: " + lastError.getMessage(), lastError);
        throw new IllegalStateException("No vision model configured");
    }

    private String extractTextFromImage(String dataUrl) {
        for (String model : visionModels()) {
            Map<String, Object> textContent = Map.of(
                    "type",
                    "text",
                    "text",
                    """
                    Bạn là OCR tiếng Việt cho tài liệu y tế.
                    Hãy đọc ảnh và chép lại TOÀN BỘ chữ nhìn thấy được.
                    Giữ nguyên tên bệnh viện, bác sĩ, ngày tháng, chẩn đoán, kết quả, thuốc và lời dặn.
                    Nếu gặp dấu "-" mở đầu ý hoặc phân tách ý trong kết quả, hãy xuống dòng trước dấu "-" để dễ đọc.
                    Không giải thích, không tóm tắt, không tạo JSON.
                    Nếu ảnh không có chữ hoặc chữ quá mờ, chỉ trả: KHONG_DOC_DUOC.
                    """
            );
            Map<String, Object> imageContent = Map.of("type", "image_url", "image_url", Map.of("url", dataUrl));
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(Map.of("role", "user", "content", List.of(textContent, imageContent))),
                    "temperature", 0.0,
                    "max_tokens", 1800
            );
            try {
                String text = extractAssistantText(callGroq(requestBody));
                if (isUsefulOcrText(text)) return text;
                log.warn("Image OCR pre-pass returned no useful text with model {}", model);
            } catch (Exception e) {
                log.warn("Image OCR pre-pass failed with model {}: {}", model, e.getMessage());
            }
        }
        return "";
    }

    private boolean isUsefulOcrText(String text) {
        if (!StringUtils.hasText(text)) return false;
        String normalized = text.trim().toLowerCase();
        if (normalized.contains("khong_doc_duoc") || normalized.contains("không đọc được")) return false;
        return normalized.length() >= 20;
    }

    private String analyzeExtractedText(String text) {
        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "messages", List.of(Map.of("role", "user", "content", importPrompt(text))),
                "temperature", 0.05,
                "max_tokens", 2200
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
        return analyzeExtractedText(text);
    }

    private String importPrompt(String extractedPdfText) {
        String source = StringUtils.hasText(extractedPdfText)
                ? "\n\nNội dung PDF đã trích xuất:\n" + limit(extractedPdfText, 9000)
                : "";
        return """
                Bạn là trợ lý nhập liệu cho sổ sức khỏe trẻ em.
                Nhiệm vụ: OCR/đọc giấy khám, phiếu xét nghiệm, kết quả siêu âm hoặc đơn thuốc rồi bóc tách thành dữ liệu có cấu trúc.
                Không chẩn đoán, không tự thêm thuốc/liều nếu tài liệu không ghi rõ.

                Chỉ trả về JSON hợp lệ, không markdown, theo schema:
                {
                  "extractedText": "văn bản đọc được, giữ thông tin y tế quan trọng; nếu gặp dấu '-' thì xuống dòng trước dấu '-'",
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

                Quy tắc bóc tách:
                - Một lần khám/kết quả khám nên tạo 1 record CHECKUP.
                - Mỗi thuốc trong đơn nên tạo 1 record MEDICATION riêng nếu đọc được tên thuốc.
                - Dị ứng thuốc/thức ăn tạo ALLERGY.
                - Bệnh lý/tình trạng theo dõi tạo CONDITION.
                - Ngày không chắc thì null.
                - Luôn thêm cảnh báo kiểm tra lại tên thuốc và liều dùng nếu có thuốc.
                - Trong extractedText, nếu gặp dấu "-" dùng để liệt kê hoặc phân tách ý, phải xuống dòng trước dấu "-".
                - Nếu đọc được bất kỳ chữ/nội dung y tế nào nhưng không chắc schema, vẫn tạo 1 record NOTE với title ngắn và notes chứa nội dung đọc được để phụ huynh kiểm tra.
                - Không trả records rỗng nếu extractedText có nội dung đọc được.
                - Nếu ảnh không phải tài liệu y tế hoặc không đọc được chữ, trả extractedText rỗng và records rỗng.
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

        String extractedText = root.path("extractedText").asText("");
        if (records.isEmpty() && StringUtils.hasText(extractedText)) {
            records.add(new HealthRecordRequest(
                    HealthRecord.Type.NOTE,
                    "Nội dung sức khỏe cần kiểm tra",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    HealthRecord.HereditarySide.UNKNOWN,
                    HealthRecord.Severity.LOW,
                    clean(extractedText),
                    null  // subjectId: null = hồ sơ của Bé
            ));
            warnings.add("AI đọc được một phần nội dung nhưng chưa bóc tách chắc chắn. Mình đã tạo bản nháp ghi chú để ba mẹ kiểm tra và chỉnh lại trước khi lưu.");
        } else if (records.isEmpty()) {
            warnings.add("AI chưa bóc tách được hồ sơ nào. Phụ huynh nên nhập tay hoặc thử ảnh rõ hơn.");
        }
        if (warnings.isEmpty()) {
            warnings.add("Vui lòng kiểm tra lại toàn bộ thông tin trước khi lưu, đặc biệt tên thuốc và liều dùng.");
        }
        return new HealthRecordImportResponse(records, extractedText, warnings);
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
                clean(node.path("notes").asText(null)),
                null  // subjectId: null = hồ sơ của Bé
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

    private List<String> visionModels() {
        Set<String> models = new LinkedHashSet<>();
        if (StringUtils.hasText(visionModel)) models.add(visionModel.trim());
        if (StringUtils.hasText(visionFallbackModels)) {
            Arrays.stream(visionFallbackModels.split(","))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .forEach(models::add);
        }
        return List.copyOf(models);
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

    private ImagePayload normalizeImage(MultipartFile file) throws IOException {
        byte[] original = file.getBytes();
        BufferedImage source = ImageIO.read(file.getInputStream());
        if (source == null) {
            String contentType = file.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : file.getContentType();
            return new ImagePayload(contentType, original);
        }

        int maxSide = 1800;
        double scale = Math.min(1.0, (double) maxSide / Math.max(source.getWidth(), source.getHeight()));
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));

        BufferedImage normalized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = normalized.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setColor(java.awt.Color.WHITE);
        graphics.fillRect(0, 0, width, height);
        graphics.drawImage(source, 0, 0, width, height, null);
        graphics.dispose();

        return new ImagePayload(MediaType.IMAGE_JPEG_VALUE, writeJpeg(normalized, 0.9f));
    }

    private byte[] writeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            ByteArrayOutputStream fallback = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", fallback);
            return fallback.toByteArray();
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(imageOutput);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), params);
            return output.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private void requireWriter(UUID userId, UUID familyId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("Tài khoản này chỉ có quyền xem sổ sức khỏe");
        }
    }

    private record ImagePayload(String contentType, byte[] bytes) {}
}
