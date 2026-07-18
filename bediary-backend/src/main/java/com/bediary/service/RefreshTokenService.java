package com.bediary.service;

import com.bediary.entity.RefreshToken;
import com.bediary.entity.User;
import com.bediary.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${bediary.auth.refresh-token.expiration-ms:2592000000}")
    private long refreshTokenExpirationMs;

    @Transactional
    public IssuedRefreshToken issue(User user, UUID familyId) {
        String rawToken = generateOpaqueToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setFamilyId(familyId);
        // Never store raw refresh tokens. A DB leak should not become active sessions.
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setExpiresAt(Instant.now().plusMillis(refreshTokenExpirationMs));

        refreshTokenRepository.save(refreshToken);
        return new IssuedRefreshToken(rawToken, refreshToken);
    }

    @Transactional
    public RotationResult rotate(String rawToken) {
        String currentHash = hash(rawToken);
        Instant now = Instant.now();

        RefreshToken current = refreshTokenRepository.findByTokenHash(currentHash)
                .orElseThrow(() -> new AccessDeniedException("Refresh token không hợp lệ."));

        if (!current.isActive(now)) {
            // Token reuse can mean theft. Revoke all active sessions for that user.
            refreshTokenRepository.revokeAllActiveByUserId(current.getUser().getId(), now);
            throw new AccessDeniedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        IssuedRefreshToken next = issue(current.getUser(), current.getFamilyId());

        // Refresh token rotation: old token becomes unusable immediately after refresh.
        current.setRevokedAt(now);
        current.setReplacedByHash(next.entity().getTokenHash());
        refreshTokenRepository.save(current);

        return new RotationResult(current, next.rawToken());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    public Duration refreshTtl() {
        return Duration.ofMillis(refreshTokenExpirationMs);
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public record IssuedRefreshToken(String rawToken, RefreshToken entity) {}
    public record RotationResult(RefreshToken previousToken, String newRawToken) {}
}
