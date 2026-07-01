package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalTime;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "routines")
public class Routine {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType;

    @Column(name = "scheduled_time", nullable = false)
    private LocalTime scheduledTime;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Routine() {}

    public UUID getId()                  { return id; }
    public Family getFamily()            { return family; }
    public String getLabel()             { return label; }
    public String getActivityType()      { return activityType; }
    public LocalTime getScheduledTime()  { return scheduledTime; }
    public boolean isActive()            { return isActive; }
    public Instant getCreatedAt()        { return createdAt; }

    public void setId(UUID id)              { this.id = id; }
    public void setFamily(Family f)         { this.family = f; }
    public void setLabel(String label)      { this.label = label; }
    public void setActivityType(String t)   { this.activityType = t; }
    public void setScheduledTime(LocalTime t){ this.scheduledTime = t; }
    public void setActive(boolean b)        { this.isActive = b; }
    public void setCreatedAt(Instant t)     { this.createdAt = t; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final Routine r = new Routine();
        public Builder family(Family v)         { r.family = v; return this; }
        public Builder label(String v)          { r.label = v; return this; }
        public Builder activityType(String v)   { r.activityType = v; return this; }
        public Builder scheduledTime(LocalTime v){ r.scheduledTime = v; return this; }
        public Builder isActive(boolean v)      { r.isActive = v; return this; }
        public Routine build()                  { return r; }
    }
}
