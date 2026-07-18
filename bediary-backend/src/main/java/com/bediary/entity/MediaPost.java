package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "media_posts")
public class MediaPost {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "media_url", nullable = false, length = 500)
    private String mediaUrl;

    @Column(name = "media_storage_path", length = 700)
    private String mediaStoragePath;

    /** IMAGE | VIDEO stored as string */
    @Column(name = "media_type", nullable = false, length = 20)
    private String mediaType;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @Column(name = "reaction_count", nullable = false)
    private int reactionCount = 0;

    @Column(name = "comment_count", nullable = false)
    private int commentCount = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_captions", columnDefinition = "jsonb")
    private List<String> aiCaptions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public MediaPost() {}

    public UUID getId()             { return id; }
    public Family getFamily()       { return family; }
    public User getUploadedBy()     { return uploadedBy; }
    public String getMediaUrl()     { return mediaUrl; }
    public String getMediaStoragePath() { return mediaStoragePath; }
    public String getMediaType()    { return mediaType; }
    public String getCaption()      { return caption; }
    public int getReactionCount()   { return reactionCount; }
    public int getCommentCount()    { return commentCount; }
    public List<String> getAiCaptions() { return aiCaptions; }
    public Instant getCreatedAt()   { return createdAt; }

    public void setId(UUID id)              { this.id = id; }
    public void setFamily(Family f)         { this.family = f; }
    public void setUploadedBy(User u)       { this.uploadedBy = u; }
    public void setMediaUrl(String url)     { this.mediaUrl = url; }
    public void setMediaStoragePath(String storagePath) { this.mediaStoragePath = storagePath; }
    public void setMediaType(String t)      { this.mediaType = t; }
    public void setCaption(String c)        { this.caption = c; }
    public void setReactionCount(int n)     { this.reactionCount = n; }
    public void setCommentCount(int n)      { this.commentCount = n; }
    public void setAiCaptions(List<String> l){ this.aiCaptions = l; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final MediaPost p = new MediaPost();
        public Builder family(Family v)      { p.family = v; return this; }
        public Builder uploadedBy(User v)    { p.uploadedBy = v; return this; }
        public Builder mediaUrl(String v)    { p.mediaUrl = v; return this; }
        public Builder mediaStoragePath(String v) { p.mediaStoragePath = v; return this; }
        public Builder mediaType(String v)   { p.mediaType = v; return this; }
        public Builder caption(String v)     { p.caption = v; return this; }
        public MediaPost build()             { return p; }
    }
}
