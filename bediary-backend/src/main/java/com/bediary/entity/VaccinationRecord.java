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

    @Column(name = "vaccine_name", nullable = false, length = 100)
    private String vaccineName;

    @Column(name = "dose_number", nullable = false)
    private int doseNumber = 1;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

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

    public UUID getId()               { return id; }
    public Family getFamily()         { return family; }
    public String getVaccineName()    { return vaccineName; }
    public int getDoseNumber()        { return doseNumber; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public Instant getCompletedAt()   { return completedAt; }
    public User getCompletedBy()      { return completedBy; }
    public String getNotes()          { return notes; }
    public Instant getCreatedAt()     { return createdAt; }

    public void setId(UUID id)                 { this.id = id; }
    public void setFamily(Family f)            { this.family = f; }
    public void setVaccineName(String v)       { this.vaccineName = v; }
    public void setDoseNumber(int v)           { this.doseNumber = v; }
    public void setScheduledDate(LocalDate d)  { this.scheduledDate = d; }
    public void setCompletedAt(Instant t)      { this.completedAt = t; }
    public void setCompletedBy(User u)         { this.completedBy = u; }
    public void setNotes(String notes)         { this.notes = notes; }
    public void setCreatedAt(Instant t)        { this.createdAt = t; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final VaccinationRecord v = new VaccinationRecord();
        public Builder family(Family fam)        { v.family = fam; return this; }
        public Builder vaccineName(String n)     { v.vaccineName = n; return this; }
        public Builder doseNumber(int d)         { v.doseNumber = d; return this; }
        public Builder scheduledDate(LocalDate d){ v.scheduledDate = d; return this; }
        public Builder notes(String n)           { v.notes = n; return this; }
        public VaccinationRecord build()         { return v; }
    }
}
