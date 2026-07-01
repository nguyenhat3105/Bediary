package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "post_comments")
public class PostComment {

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

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public PostComment() {}

    public UUID getId()           { return id; }
    public MediaPost getPost()    { return post; }
    public User getUser()         { return user; }
    public String getContent()    { return content; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID id)          { this.id = id; }
    public void setPost(MediaPost p)    { this.post = p; }
    public void setUser(User u)         { this.user = u; }
    public void setContent(String c)    { this.content = c; }
    public void setCreatedAt(Instant t) { this.createdAt = t; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final PostComment c = new PostComment();
        public Builder post(MediaPost v)  { c.post = v; return this; }
        public Builder user(User v)       { c.user = v; return this; }
        public Builder content(String v)  { c.content = v; return this; }
        public PostComment build()        { return c; }
    }
}
