package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(columnDefinition = "jsonb")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private Map<String, Object> payload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Notification() {}

    // Getters
    public UUID getId()                   { return id; }
    public Family getFamily()             { return family; }
    public User getUser()                 { return user; }
    public String getType()               { return type; }
    public String getTitle()              { return title; }
    public String getBody()               { return body; }
    public boolean isRead()               { return isRead; }
    public Map<String, Object> getPayload() { return payload; }
    public Instant getCreatedAt()         { return createdAt; }

    // Setters
    public void setId(UUID id)            { this.id = id; }
    public void setFamily(Family f)       { this.family = f; }
    public void setUser(User u)           { this.user = u; }
    public void setType(String type)      { this.type = type; }
    public void setTitle(String title)    { this.title = title; }
    public void setBody(String body)      { this.body = body; }
    public void setRead(boolean r)        { this.isRead = r; }
    public void setPayload(Map<String, Object> p) { this.payload = p; }
    public void setCreatedAt(Instant t)   { this.createdAt = t; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final Notification n = new Notification();
        public Builder family(Family v)    { n.family = v; return this; }
        public Builder user(User v)        { n.user = v; return this; }
        public Builder type(String v)      { n.type = v; return this; }
        public Builder title(String v)     { n.title = v; return this; }
        public Builder body(String v)      { n.body = v; return this; }
        public Builder payload(Map<String, Object> v) { n.payload = v; return this; }
        public Notification build()        { return n; }
    }
}
