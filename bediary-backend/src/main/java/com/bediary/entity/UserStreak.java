package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_streaks")
public class UserStreak {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false, unique = true)
    private Family family;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    private int longestStreak = 0;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    public UserStreak() {}

    // Getters
    public UUID getId()                        { return id; }
    public Family getFamily()                  { return family; }
    public int getCurrentStreak()              { return currentStreak; }
    public int getLongestStreak()              { return longestStreak; }
    public LocalDate getLastActivityDate()     { return lastActivityDate; }

    // Setters
    public void setId(UUID id)                 { this.id = id; }
    public void setFamily(Family f)            { this.family = f; }
    public void setCurrentStreak(int v)        { this.currentStreak = v; }
    public void setLongestStreak(int v)        { this.longestStreak = v; }
    public void setLastActivityDate(LocalDate d) { this.lastActivityDate = d; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final UserStreak s = new UserStreak();
        public Builder family(Family v)            { s.family = v; return this; }
        public Builder currentStreak(int v)        { s.currentStreak = v; return this; }
        public Builder longestStreak(int v)        { s.longestStreak = v; return this; }
        public Builder lastActivityDate(LocalDate v){ s.lastActivityDate = v; return this; }
        public UserStreak build()                  { return s; }
    }
}
