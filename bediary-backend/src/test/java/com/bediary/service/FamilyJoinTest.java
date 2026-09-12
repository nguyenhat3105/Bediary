package com.bediary.service;

import com.bediary.entity.*;
import com.bediary.repository.*;
import com.bediary.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FamilyJoinTest {
    @Mock FamilyRepository families;
    @Mock FamilyMemberRepository members;
    @Mock UserRepository users;
    @Mock JwtUtil jwt;
    @InjectMocks FamilyService service;

    @Test
    void linkingRequiresParentRightsOnBothHouseholds() {
        UUID actorId = UUID.randomUUID();
        Family first = new Family(); first.setId(UUID.randomUUID());
        Family second = new Family(); second.setId(UUID.randomUUID());
        when(families.findById(first.getId())).thenReturn(Optional.of(first));
        when(families.findById(second.getId())).thenReturn(Optional.of(second));
        when(members.findByFamilyIdAndUserId(first.getId(), actorId)).thenReturn(Optional.of(
                FamilyMember.builder().role(FamilyMember.Role.PARENT).build()));
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.linkHouseholds(first.getId(), second.getId(), actorId));
        assertNull(first.getHouseholdId());
        verify(members, never()).save(any());
    }

    @Test
    void removalAppliesToEveryBaby() {
        UUID actorId = UUID.randomUUID(), targetId = UUID.randomUUID(), groupId = UUID.randomUUID();
        Family first = new Family(); first.setId(UUID.randomUUID()); first.setHouseholdId(groupId);
        Family second = new Family(); second.setId(UUID.randomUUID()); second.setHouseholdId(groupId);
        when(families.findByHouseholdId(groupId)).thenReturn(List.of(first, second));
        when(members.findByFamilyIdAndUserId(first.getId(), actorId)).thenReturn(Optional.of(
                FamilyMember.builder().family(first).role(FamilyMember.Role.PARENT).build()));
        for (Family baby : List.of(first, second)) {
            when(members.findByFamilyIdAndUserId(baby.getId(), targetId)).thenReturn(Optional.of(
                    FamilyMember.builder().family(baby).role(FamilyMember.Role.VIEWER).build()));
        }
        service.updateHouseholdMember(first.getId(), actorId, targetId, null);
        verify(members, times(2)).delete(any());
    }

    @Test
    void inviteGrantsMembershipToEveryBabyInHousehold() {
        UUID userId = UUID.randomUUID(), groupId = UUID.randomUUID();
        Family first = new Family(); first.setId(UUID.randomUUID()); first.setHouseholdId(groupId);
        Family second = new Family(); second.setId(UUID.randomUUID()); second.setHouseholdId(groupId);
        User user = new User(); user.setId(userId);
        when(families.findByInviteCode("INVITE")).thenReturn(Optional.of(first));
        when(families.findByHouseholdId(groupId)).thenReturn(List.of(first, second));
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(members.save(any())).thenAnswer(call -> call.getArgument(0));
        service.joinFamily("INVITE", userId);
        ArgumentCaptor<FamilyMember> saved = ArgumentCaptor.forClass(FamilyMember.class);
        verify(members, times(2)).save(saved.capture());
        assertEquals(Set.of(first.getId(), second.getId()), saved.getAllValues().stream()
                .map(member -> member.getFamily().getId()).collect(java.util.stream.Collectors.toSet()));
        assertTrue(saved.getAllValues().stream().allMatch(member -> member.getRole() == FamilyMember.Role.VIEWER));
    }

    @Test
    void newBabyInheritsExistingMembers() {
        UUID userId = UUID.randomUUID();
        Family source = new Family(); source.setId(UUID.randomUUID());
        User parent = new User(); parent.setId(userId);
        User viewer = new User(); viewer.setId(UUID.randomUUID());
        var parentMember = FamilyMember.builder().family(source).user(parent).role(FamilyMember.Role.PARENT).build();
        var viewerMember = FamilyMember.builder().family(source).user(viewer).role(FamilyMember.Role.VIEWER).build();
        when(users.findById(userId)).thenReturn(Optional.of(parent));
        when(members.findByFamilyIdAndUserId(source.getId(), userId)).thenReturn(Optional.of(parentMember));
        when(members.findByFamilyId(source.getId())).thenReturn(List.of(parentMember, viewerMember));
        when(families.save(any())).thenAnswer(call -> { Family baby = call.getArgument(0); baby.setId(UUID.randomUUID()); return baby; });
        service.createFamily(new com.bediary.dto.CreateFamilyRequest("Baby", java.time.LocalDate.now(), Family.Gender.MALE, source.getId()), userId);
        ArgumentCaptor<FamilyMember> saved = ArgumentCaptor.forClass(FamilyMember.class);
        verify(members, times(2)).save(saved.capture());
        assertTrue(saved.getAllValues().stream().anyMatch(member -> member.getUser() == viewer && member.getRole() == FamilyMember.Role.VIEWER));
    }

    @Test
    void existingMemberGetsFreshSessionWithoutDuplicateOrRoleChange() {
        UUID familyId = UUID.randomUUID(), userId = UUID.randomUUID();
        Family family = mock(Family.class);
        User user = mock(User.class);
        when(family.getId()).thenReturn(familyId);
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn("test@example.com");
        when(families.findByInviteCode("INVITE")).thenReturn(Optional.of(family));
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(members.findByFamilyIdAndUserId(familyId, userId)).thenReturn(Optional.of(
                FamilyMember.builder().family(family).user(user).role(FamilyMember.Role.CAREGIVER).build()));
        when(jwt.generateToken(userId, familyId, "test@example.com")).thenReturn("fresh-token");
        var response = service.joinFamily(" INVITE ", userId);
        assertEquals("fresh-token", response.newToken());
        assertEquals("CAREGIVER", response.role());
        assertEquals(familyId, response.familyId());
        verify(members, never()).save(any());
    }

    @Test
    void differentUsersCanJoinSameFamilyAsViewers() {
        UUID familyId = UUID.randomUUID();
        Family family = mock(Family.class);
        when(family.getId()).thenReturn(familyId);
        when(families.findByInviteCode("INVITE")).thenReturn(Optional.of(family));
        when(members.save(any())).thenAnswer(call -> call.getArgument(0));
        for (int i = 0; i < 2; i++) {
            UUID userId = UUID.randomUUID();
            User user = mock(User.class);
            when(user.getId()).thenReturn(userId);
            when(users.findById(userId)).thenReturn(Optional.of(user));
            when(members.findByFamilyIdAndUserId(familyId, userId)).thenReturn(Optional.empty());
            assertEquals("VIEWER", service.joinFamily("INVITE", userId).role());
        }
        verify(members, times(2)).save(any());
    }
}
