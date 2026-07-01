package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "routine_logs")
public class RoutineLog {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_id")
    private Routine routine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logged_by", nullable = false)
    private User loggedBy;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @Column(name = "deviation_minutes")
    private Integer deviationMinutes;

    @Column(name = "schedule_updated", nullable = false)
    private boolean scheduleUpdated = false;

    @Column(length = 500)
    private String note;

    public RoutineLog() {}

    public UUID getId()                  { return id; }
    public Family getFamily()            { return family; }
    public Routine getRoutine()          { return routine; }
    public User getLoggedBy()            { return loggedBy; }
    public Instant getExecutedAt()       { return executedAt; }
    public Integer getDeviationMinutes() { return deviationMinutes; }
    public boolean isScheduleUpdated()   { return scheduleUpdated; }
    public String getNote()              { return note; }

    public void setId(UUID id)                     { this.id = id; }
    public void setFamily(Family f)                { this.family = f; }
    public void setRoutine(Routine r)              { this.routine = r; }
    public void setLoggedBy(User u)                { this.loggedBy = u; }
    public void setExecutedAt(Instant t)           { this.executedAt = t; }
    public void setDeviationMinutes(Integer d)     { this.deviationMinutes = d; }
    public void setScheduleUpdated(boolean b)      { this.scheduleUpdated = b; }
    public void setNote(String note)               { this.note = note; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final RoutineLog l = new RoutineLog();
        public Builder family(Family v)            { l.family = v; return this; }
        public Builder routine(Routine v)          { l.routine = v; return this; }
        public Builder loggedBy(User v)            { l.loggedBy = v; return this; }
        public Builder executedAt(Instant v)       { l.executedAt = v; return this; }
        public Builder deviationMinutes(Integer v) { l.deviationMinutes = v; return this; }
        public Builder note(String v)              { l.note = v; return this; }
        public RoutineLog build()                  { return l; }
    }
}
