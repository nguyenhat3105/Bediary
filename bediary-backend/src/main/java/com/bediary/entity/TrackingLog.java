package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tracking_logs")
public class TrackingLog {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    public TrackingLog() {}

    public UUID getId()                       { return id; }
    public Family getFamily()                 { return family; }
    public User getCreatedBy()                { return createdBy; }
    public String getActivityType()           { return activityType; }
    public Instant getStartTime()             { return startTime; }
    public Instant getEndTime()               { return endTime; }
    public Map<String, Object> getMetadata()  { return metadata; }

    public void setId(UUID id)                       { this.id = id; }
    public void setFamily(Family f)                  { this.family = f; }
    public void setCreatedBy(User u)                 { this.createdBy = u; }
    public void setActivityType(String t)            { this.activityType = t; }
    public void setStartTime(Instant t)              { this.startTime = t; }
    public void setEndTime(Instant t)                { this.endTime = t; }
    public void setMetadata(Map<String, Object> m)   { this.metadata = m; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final TrackingLog l = new TrackingLog();
        public Builder family(Family v)              { l.family = v; return this; }
        public Builder createdBy(User v)             { l.createdBy = v; return this; }
        public Builder activityType(String v)        { l.activityType = v; return this; }
        public Builder startTime(Instant v)          { l.startTime = v; return this; }
        public Builder endTime(Instant v)            { l.endTime = v; return this; }
        public Builder metadata(Map<String, Object> v){ l.metadata = v; return this; }
        public TrackingLog build()                   { return l; }
    }
}
