package com.bediary.service;

import com.bediary.dto.TrackingLogRequest;
import com.bediary.entity.*;
import com.bediary.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ViewerTrackingTest {
    @Mock TrackingLogRepository logs;
    @Mock FamilyMemberRepository members;
    @Mock FamilyRepository families;
    @Mock UserRepository users;
    @Mock StreakService streak;
    @InjectMocks TrackingService service;

    @Test void viewerCanAddButCannotEditOrDelete() {
        UUID familyId = UUID.randomUUID(), userId = UUID.randomUUID();
        when(members.findByFamilyIdAndUserId(familyId, userId)).thenReturn(Optional.of(
                FamilyMember.builder().role(FamilyMember.Role.VIEWER).build()));
        when(families.findById(familyId)).thenReturn(Optional.of(new Family()));
        when(users.findById(userId)).thenReturn(Optional.of(new User()));
        when(logs.save(any())).thenAnswer(call -> call.getArgument(0));
        var request = new TrackingLogRequest("FEED", Instant.now(), null, Map.of("value", 120));
        assertNotNull(service.logActivity(request, userId, familyId));
        assertThrows(AccessDeniedException.class, () -> service.updateActivity(UUID.randomUUID(), request, userId, familyId));
        assertThrows(AccessDeniedException.class, () -> service.deleteActivity(UUID.randomUUID(), userId, familyId));
        verify(logs, times(1)).save(any());
    }
    @Test void outsiderCannotAdd() {
        assertThrows(AccessDeniedException.class, () -> service.logActivity(
                new TrackingLogRequest("FEED", Instant.now(), null, Map.of()), UUID.randomUUID(), UUID.randomUUID()));
        verifyNoInteractions(logs);
    }
}
