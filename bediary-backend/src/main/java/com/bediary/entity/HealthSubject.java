package com.bediary.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "health_subjects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HealthSubject {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    /** "Ba", "Mẹ", "Ông", "Bà", "Khác" */
    @Column(length = 30, nullable = false)
    private String relationship;

    /** Tên hiển thị tuỳ chỉnh, ví dụ "Ba Minh" */
    @Column(length = 80)
    private String displayName;

    @CreationTimestamp
    private Instant createdAt;
}
