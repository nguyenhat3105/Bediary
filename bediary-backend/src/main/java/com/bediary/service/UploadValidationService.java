package com.bediary.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class UploadValidationService {

    public String requireImageOrVideo(MultipartFile file) throws IOException {
        requireFile(file);
        String contentType = safeContentType(file);
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
            throw new IllegalArgumentException("Chỉ hỗ trợ upload ảnh hoặc video.");
        }
        byte[] header = readHeader(file);
        if (contentType.startsWith("image/") && !looksLikeImage(header)) {
            throw new IllegalArgumentException("File không phải là ảnh hợp lệ.");
        }
        if (contentType.startsWith("video/") && !looksLikeVideo(header)) {
            throw new IllegalArgumentException("File không phải là video hợp lệ.");
        }
        return contentType.startsWith("video/") ? "VIDEO" : "IMAGE";
    }

    public void requireImage(MultipartFile file, String message) throws IOException {
        requireFile(file);
        String contentType = safeContentType(file);
        if (!contentType.startsWith("image/") || !looksLikeImage(readHeader(file))) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requireFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File upload là bắt buộc.");
        }
    }

    private String safeContentType(MultipartFile file) {
        return file.getContentType() != null ? file.getContentType().toLowerCase() : "";
    }

    private byte[] readHeader(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        int length = Math.min(bytes.length, 32);
        byte[] header = new byte[length];
        System.arraycopy(bytes, 0, header, 0, length);
        return header;
    }

    private boolean looksLikeImage(byte[] header) {
        return isPng(header) || isJpeg(header) || isGif(header) || isWebp(header);
    }

    private boolean looksLikeVideo(byte[] header) {
        return isMp4OrMov(header) || isWebm(header);
    }

    private boolean isPng(byte[] h) {
        return h.length >= 8
                && (h[0] & 0xFF) == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A;
    }

    private boolean isJpeg(byte[] h) {
        return h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
    }

    private boolean isGif(byte[] h) {
        if (h.length < 6) return false;
        String prefix = new String(h, 0, 6, StandardCharsets.US_ASCII);
        return "GIF87a".equals(prefix) || "GIF89a".equals(prefix);
    }

    private boolean isWebp(byte[] h) {
        if (h.length < 12) return false;
        String riff = new String(h, 0, 4, StandardCharsets.US_ASCII);
        String webp = new String(h, 8, 4, StandardCharsets.US_ASCII);
        return "RIFF".equals(riff) && "WEBP".equals(webp);
    }

    private boolean isMp4OrMov(byte[] h) {
        if (h.length < 12) return false;
        String marker = new String(h, 4, 4, StandardCharsets.US_ASCII);
        return "ftyp".equals(marker);
    }

    private boolean isWebm(byte[] h) {
        return h.length >= 4
                && (h[0] & 0xFF) == 0x1A
                && (h[1] & 0xFF) == 0x45
                && (h[2] & 0xFF) == 0xDF
                && (h[3] & 0xFF) == 0xA3;
    }
}
