package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "health_records", indexes = {
        @Index(name = "idx_health_records_family_type_date", columnList = "family_id, record_type, event_date"),
        @Index(name = "idx_health_records_family_next_date", columnList = "family_id, next_follow_up_date")
})
public class HealthRecord {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "record_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private Type recordType;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "next_follow_up_date")
    private LocalDate nextFollowUpDate;

    @Column(length = 160)
    private String facility;

    @Column(name = "doctor_name", length = 120)
    private String doctorName;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "medication_name", length = 180)
    private String medicationName;

    @Column(name = "medication_dosage", length = 180)
    private String medicationDosage;

    @Column(name = "medication_status", length = 30)
    @Enumerated(EnumType.STRING)
    private MedicationStatus medicationStatus;

    @Column(name = "hereditary_side", length = 30)
    @Enumerated(EnumType.STRING)
    private HereditarySide hereditarySide;

    @Column(length = 30)
    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** null = record thuộc về Bé; non-null = record thuộc về người thân (Ba/Mẹ...) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private HealthSubject subject;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum Type { CHECKUP, CONDITION, HEREDITARY, MEDICATION, ALLERGY, NOTE }
    public enum Severity { LOW, MEDIUM, HIGH }
    public enum MedicationStatus { ACTIVE, PAUSED, COMPLETED }
    public enum HereditarySide { MATERNAL, PATERNAL, BOTH, UNKNOWN }

    public UUID getId() { return id; }
    public Family getFamily() { return family; }
    public User getCreatedBy() { return createdBy; }
    public Type getRecordType() { return recordType; }
    public String getTitle() { return title; }
    public LocalDate getEventDate() { return eventDate; }
    public LocalDate getNextFollowUpDate() { return nextFollowUpDate; }
    public String getFacility() { return facility; }
    public String getDoctorName() { return doctorName; }
    public String getDiagnosis() { return diagnosis; }
    public String getMedicationName() { return medicationName; }
    public String getMedicationDosage() { return medicationDosage; }
    public MedicationStatus getMedicationStatus() { return medicationStatus; }
    public HereditarySide getHereditarySide() { return hereditarySide; }
    public Severity getSeverity() { return severity; }
    public String getNotes() { return notes; }
    public HealthSubject getSubject() { return subject; }
    public Instant getCreatedAt() { return createdAt; }

    public void setFamily(Family family) { this.family = family; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public void setRecordType(Type recordType) { this.recordType = recordType; }
    public void setTitle(String title) { this.title = title; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public void setNextFollowUpDate(LocalDate nextFollowUpDate) { this.nextFollowUpDate = nextFollowUpDate; }
    public void setFacility(String facility) { this.facility = facility; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }
    public void setMedicationName(String medicationName) { this.medicationName = medicationName; }
    public void setMedicationDosage(String medicationDosage) { this.medicationDosage = medicationDosage; }
    public void setMedicationStatus(MedicationStatus medicationStatus) { this.medicationStatus = medicationStatus; }
    public void setHereditarySide(HereditarySide hereditarySide) { this.hereditarySide = hereditarySide; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public void setNotes(String notes) { this.notes = notes; }
    public void setSubject(HealthSubject subject) { this.subject = subject; }
}
