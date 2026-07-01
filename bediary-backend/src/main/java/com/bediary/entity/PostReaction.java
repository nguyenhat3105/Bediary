package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "post_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"}))
public class PostReaction {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private MediaPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public PostReaction() {}

    public UUID getId()           { return id; }
    public MediaPost getPost()    { return post; }
    public User getUser()         { return user; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID id)        { this.id = id; }
    public void setPost(MediaPost p)  { this.post = p; }
    public void setUser(User u)       { this.user = u; }
    public void setCreatedAt(Instant t){ this.createdAt = t; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final PostReaction r = new PostReaction();
        public Builder post(MediaPost v) { r.post = v; return this; }
        public Builder user(User v)      { r.user = v; return this; }
        public PostReaction build()      { return r; }
    }
}
