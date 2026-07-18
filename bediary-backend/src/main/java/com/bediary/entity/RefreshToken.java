package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "refresh_tokens",
        indexes = {
                @Index(name = "idx_refresh_tokens_token_hash", columnList = "token_hash", unique = true),
                @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id")
        }
)
public class RefreshToken {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "family_id")
    private UUID familyId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by_hash", length = 64)
    private String replacedByHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public UUID getFamilyId() { return familyId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public String getReplacedByHash() { return replacedByHash; }
    public Instant getCreatedAt() { return createdAt; }

    public void setUser(User user) { this.user = user; }
    public void setFamilyId(UUID familyId) { this.familyId = familyId; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
    public void setReplacedByHash(String replacedByHash) { this.replacedByHash = replacedByHash; }

    public boolean isActive(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }
}
