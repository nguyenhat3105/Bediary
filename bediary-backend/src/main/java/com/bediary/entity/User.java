package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "is_premium")
    private Boolean isPremium = false;

    @Column(name = "premium_expires_at")
    private Instant premiumExpiresAt;

    @Column(name = "fcm_token", length = 500)
    private String fcmToken;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // Constructors
    public User() {}

    // Getters
    public UUID getId()                   { return id; }
    public String getEmail()              { return email; }
    public String getPasswordHash()       { return passwordHash; }
    public String getFullName()           { return fullName; }
    public String getAvatarUrl()          { return avatarUrl; }
    public Boolean getIsPremium()         { return isPremium; }
    public Instant getPremiumExpiresAt()  { return premiumExpiresAt; }
    public String getFcmToken()           { return fcmToken; }
    public Instant getCreatedAt()         { return createdAt; }

    // Setters
    public void setId(UUID id)                          { this.id = id; }
    public void setEmail(String email)                  { this.email = email; }
    public void setPasswordHash(String passwordHash)    { this.passwordHash = passwordHash; }
    public void setFullName(String fullName)            { this.fullName = fullName; }
    public void setAvatarUrl(String avatarUrl)          { this.avatarUrl = avatarUrl; }
    public void setIsPremium(Boolean isPremium)         { this.isPremium = isPremium; }
    public void setPremiumExpiresAt(Instant t)          { this.premiumExpiresAt = t; }
    public void setFcmToken(String fcmToken)            { this.fcmToken = fcmToken; }
    public void setCreatedAt(Instant createdAt)         { this.createdAt = createdAt; }

    // Builder pattern
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final User user = new User();
        public Builder email(String v)          { user.email = v; return this; }
        public Builder passwordHash(String v)   { user.passwordHash = v; return this; }
        public Builder fullName(String v)       { user.fullName = v; return this; }
        public Builder avatarUrl(String v)      { user.avatarUrl = v; return this; }
        public Builder isPremium(Boolean v)     { user.isPremium = v; return this; }
        public User build()                     { return user; }
    }
}
