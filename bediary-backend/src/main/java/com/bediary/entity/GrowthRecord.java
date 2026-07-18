package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "growth_records")
public class GrowthRecord {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "height_cm", precision = 5, scale = 1)
    private BigDecimal heightCm;

    @Column(name = "age_days", nullable = false)
    private int ageDays;

    /** NORMAL | UNDERWEIGHT | OVERWEIGHT | SEVERELY_UNDERWEIGHT */
    @Column(name = "weight_status", length = 30)
    private String weightStatus;

    /** NORMAL | SHORT | TALL */
    @Column(name = "height_status", length = 20)
    private String heightStatus;

    @Column(name = "weight_z_score")
    private Double weightZScore;

    @Column(name = "height_z_score")
    private Double heightZScore;

    @Column(name = "weight_percentile")
    private Double weightPercentile;

    @Column(name = "height_percentile")
    private Double heightPercentile;

    @Column(name = "growth_source", length = 120)
    private String growthSource;

    public GrowthRecord() {}

    public UUID getId()                 { return id; }
    public Family getFamily()           { return family; }
    public User getRecordedBy()         { return recordedBy; }
    public Instant getRecordedAt()      { return recordedAt; }
    public BigDecimal getWeightKg()     { return weightKg; }
    public BigDecimal getHeightCm()     { return heightCm; }
    public int getAgeDays()             { return ageDays; }
    public String getWeightStatus()     { return weightStatus; }
    public String getHeightStatus()     { return heightStatus; }
    public Double getWeightZScore()      { return weightZScore; }
    public Double getHeightZScore()      { return heightZScore; }
    public Double getWeightPercentile()  { return weightPercentile; }
    public Double getHeightPercentile()  { return heightPercentile; }
    public String getGrowthSource()      { return growthSource; }

    public void setId(UUID id)               { this.id = id; }
    public void setFamily(Family f)          { this.family = f; }
    public void setRecordedBy(User u)        { this.recordedBy = u; }
    public void setRecordedAt(Instant t)     { this.recordedAt = t; }
    public void setWeightKg(BigDecimal v)    { this.weightKg = v; }
    public void setHeightCm(BigDecimal v)    { this.heightCm = v; }
    public void setAgeDays(int v)            { this.ageDays = v; }
    public void setWeightStatus(String s)    { this.weightStatus = s; }
    public void setHeightStatus(String s)    { this.heightStatus = s; }
    public void setWeightZScore(Double v)     { this.weightZScore = v; }
    public void setHeightZScore(Double v)     { this.heightZScore = v; }
    public void setWeightPercentile(Double v) { this.weightPercentile = v; }
    public void setHeightPercentile(Double v) { this.heightPercentile = v; }
    public void setGrowthSource(String v)     { this.growthSource = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final GrowthRecord r = new GrowthRecord();
        public Builder family(Family v)         { r.family = v; return this; }
        public Builder recordedBy(User v)       { r.recordedBy = v; return this; }
        public Builder recordedAt(Instant v)    { r.recordedAt = v; return this; }
        public Builder weightKg(BigDecimal v)   { r.weightKg = v; return this; }
        public Builder heightCm(BigDecimal v)   { r.heightCm = v; return this; }
        public Builder ageDays(int v)           { r.ageDays = v; return this; }
        public Builder weightStatus(String v)   { r.weightStatus = v; return this; }
        public Builder heightStatus(String v)   { r.heightStatus = v; return this; }
        public Builder weightZScore(Double v)   { r.weightZScore = v; return this; }
        public Builder heightZScore(Double v)   { r.heightZScore = v; return this; }
        public Builder weightPercentile(Double v){ r.weightPercentile = v; return this; }
        public Builder heightPercentile(Double v){ r.heightPercentile = v; return this; }
        public Builder growthSource(String v)   { r.growthSource = v; return this; }
        public GrowthRecord build()             { return r; }
    }
}
