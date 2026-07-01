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
    public String getInviteCode() { return inviteCode; }

    // Setters
    public void setId(UUID id)                 { this.id = id; }
    public void setBabyName(String babyName)   { this.babyName = babyName; }
    public void setBabyDob(LocalDate babyDob)  { this.babyDob = babyDob; }
    public void setBabyGender(Gender g)        { this.babyGender = g; }
    public void setInviteCode(String code)     { this.inviteCode = code; }

    // Builder pattern
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final Family f = new Family();
        public Builder babyName(String v)    { f.babyName = v; return this; }
        public Builder babyDob(LocalDate v)  { f.babyDob = v; return this; }
        public Builder babyGender(Gender v)  { f.babyGender = v; return this; }
        public Builder inviteCode(String v)  { f.inviteCode = v; return this; }
        public Family build()                { return f; }
    }
}
