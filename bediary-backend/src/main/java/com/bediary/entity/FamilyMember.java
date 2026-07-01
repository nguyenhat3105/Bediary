package com.bediary.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "family_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"family_id", "user_id"}))
public class FamilyMember {

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

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Role role;

    public enum Role { ADMIN, VIEWER }

    // Constructors
    public FamilyMember() {}

    // Getters
    public UUID getId()       { return id; }
    public Family getFamily() { return family; }
    public User getUser()     { return user; }
    public Role getRole()     { return role; }

    // Setters
    public void setId(UUID id)          { this.id = id; }
    public void setFamily(Family f)     { this.family = f; }
    public void setUser(User u)         { this.user = u; }
    public void setRole(Role r)         { this.role = r; }

    // Builder pattern
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final FamilyMember fm = new FamilyMember();
        public Builder family(Family v) { fm.family = v; return this; }
        public Builder user(User v)     { fm.user = v; return this; }
        public Builder role(Role v)     { fm.role = v; return this; }
        public FamilyMember build()     { return fm; }
    }
}
