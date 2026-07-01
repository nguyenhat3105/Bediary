package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "care_tips")
public class CareTip {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "start_day", nullable = false)
    private int startDay;

    @Column(name = "end_day", nullable = false)
    private int endDay;

    /** FOOD | TIP | MILESTONE */
    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** MEDICAL | FOLK */
    @Column(name = "source_type", nullable = false, length = 20)
    private String sourceType;

    @Column(name = "is_premium", nullable = false)
    private boolean isPremium = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public CareTip() {}

    public UUID getId()           { return id; }
    public int getStartDay()      { return startDay; }
    public int getEndDay()        { return endDay; }
    public String getCategory()   { return category; }
    public String getTitle()      { return title; }
    public String getContent()    { return content; }
    public String getSourceType() { return sourceType; }
    public boolean isPremium()    { return isPremium; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID id)              { this.id = id; }
    public void setStartDay(int v)          { this.startDay = v; }
    public void setEndDay(int v)            { this.endDay = v; }
    public void setCategory(String v)       { this.category = v; }
    public void setTitle(String v)          { this.title = v; }
    public void setContent(String v)        { this.content = v; }
    public void setSourceType(String v)     { this.sourceType = v; }
    public void setPremium(boolean v)       { this.isPremium = v; }
    public void setCreatedAt(Instant t)     { this.createdAt = t; }
}
