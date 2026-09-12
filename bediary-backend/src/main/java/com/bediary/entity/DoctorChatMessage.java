package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doctor_chat_messages")
public class DoctorChatMessage {

    @Id
    @UuidGenerator
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_role", nullable = false, length = 30)
    private SenderRole senderRole;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum SenderRole { FAMILY, DOCTOR }

    public UUID getId() { return id; }
    public Family getFamily() { return family; }
    public User getSender() { return sender; }
    public SenderRole getSenderRole() { return senderRole; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }

    public void setId(UUID id) { this.id = id; }
    public void setFamily(Family family) { this.family = family; }
    public void setSender(User sender) { this.sender = sender; }
    public void setSenderRole(SenderRole senderRole) { this.senderRole = senderRole; }
    public void setContent(String content) { this.content = content; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
