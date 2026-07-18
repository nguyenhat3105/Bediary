package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "families")
public class Family {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "baby_name", nullable = false, length = 100)
    private String babyName;

    @Column(name = "baby_dob", nullable = false)
    private LocalDate babyDob;

    @Column(name = "baby_gender", length = 10)
    @Enumerated(EnumType.STRING)
    private Gender babyGender;

    @Column(name = "baby_avatar_url", length = 500)
    private String babyAvatarUrl;

    @Column(name = "baby_avatar_storage_path", length = 700)
    private String babyAvatarStoragePath;

    @Column(name = "invite_code", unique = true, length = 20)
    private String inviteCode;

    public enum Gender { MALE, FEMALE }

    // Constructors
    public Family() {}

    // Getters
    public UUID getId()           { return id; }
    public String getBabyName()   { return babyName; }
    public LocalDate getBabyDob() { return babyDob; }
    public Gender getBabyGender() { return babyGender; }
    public String getBabyAvatarUrl() { return babyAvatarUrl; }
    public String getBabyAvatarStoragePath() { return babyAvatarStoragePath; }
    public String getInviteCode() { return inviteCode; }

    // Setters
    public void setId(UUID id)                 { this.id = id; }
    public void setBabyName(String babyName)   { this.babyName = babyName; }
    public void setBabyDob(LocalDate babyDob)  { this.babyDob = babyDob; }
    public void setBabyGender(Gender g)        { this.babyGender = g; }
    public void setBabyAvatarUrl(String avatarUrl) { this.babyAvatarUrl = avatarUrl; }
    public void setBabyAvatarStoragePath(String storagePath) { this.babyAvatarStoragePath = storagePath; }
    public void setInviteCode(String code)     { this.inviteCode = code; }

    // Builder pattern
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final Family f = new Family();
        public Builder babyName(String v)    { f.babyName = v; return this; }
        public Builder babyDob(LocalDate v)  { f.babyDob = v; return this; }
        public Builder babyGender(Gender v)  { f.babyGender = v; return this; }
        public Builder babyAvatarUrl(String v) { f.babyAvatarUrl = v; return this; }
        public Builder babyAvatarStoragePath(String v) { f.babyAvatarStoragePath = v; return this; }
        public Builder inviteCode(String v)  { f.inviteCode = v; return this; }
        public Family build()                { return f; }
    }
}
