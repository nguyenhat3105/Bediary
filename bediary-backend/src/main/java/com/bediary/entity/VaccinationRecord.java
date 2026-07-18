package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "vaccination_records")
public class VaccinationRecord {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @Column(name = "schedule_key", length = 120)
    private String scheduleKey;

    @Column(name = "vaccine_name", nullable = false, length = 100)
    private String vaccineName;

    @Column(name = "dose_number", nullable = false)
    private int doseNumber = 1;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "category", length = 20)
    private String category = "OPTIONAL";

    @Column(name = "age_label", length = 80)
    private String ageLabel;

    @Column(name = "completed_at")
    private Instant completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by")
    private User completedBy;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public VaccinationRecord() {}

    public UUID getId() { return id; }
    public Family getFamily() { return family; }
    public String getScheduleKey() { return scheduleKey; }
    public String getVaccineName() { return vaccineName; }
    public int getDoseNumber() { return doseNumber; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public String getCategory() { return category; }
    public String getAgeLabel() { return ageLabel; }
    public Instant getCompletedAt() { return completedAt; }
    public User getCompletedBy() { return completedBy; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID id) { this.id = id; }
    public void setFamily(Family f) { this.family = f; }
    public void setScheduleKey(String v) { this.scheduleKey = v; }
    public void setVaccineName(String v) { this.vaccineName = v; }
    public void setDoseNumber(int v) { this.doseNumber = v; }
    public void setScheduledDate(LocalDate d) { this.scheduledDate = d; }
    public void setCategory(String v) { this.category = v; }
    public void setAgeLabel(String v) { this.ageLabel = v; }
    public void setCompletedAt(Instant t) { this.completedAt = t; }
    public void setCompletedBy(User u) { this.completedBy = u; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setCreatedAt(Instant t) { this.createdAt = t; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final VaccinationRecord v = new VaccinationRecord();
        public Builder family(Family fam) { v.family = fam; return this; }
        public Builder scheduleKey(String key) { v.scheduleKey = key; return this; }
        public Builder vaccineName(String n) { v.vaccineName = n; return this; }
        public Builder doseNumber(int d) { v.doseNumber = d; return this; }
        public Builder scheduledDate(LocalDate d) { v.scheduledDate = d; return this; }
        public Builder category(String c) { v.category = c; return this; }
        public Builder ageLabel(String label) { v.ageLabel = label; return this; }
        public Builder notes(String n) { v.notes = n; return this; }
        public VaccinationRecord build() { return v; }
    }
}