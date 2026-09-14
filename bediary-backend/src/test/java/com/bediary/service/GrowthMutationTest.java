package com.bediary.service;

import com.bediary.entity.*;
import com.bediary.dto.GrowthRecordRequest;
import com.bediary.repository.*;
import com.bediary.util.WhoGrowthUtil;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GrowthMutationTest {
    @Mock GrowthRecordRepository records;
    @Mock FamilyMemberRepository members;
    @Mock FamilyRepository families;
    @Mock UserRepository users;
    @Mock TrackingLogRepository logs;
    @Mock WhoGrowthUtil who;
    @InjectMocks GrowthService service;
    UUID user = UUID.randomUUID(), family = UUID.randomUUID(), id = UUID.randomUUID();

    void role(FamilyMember.Role role) {
        when(members.findByFamilyIdAndUserId(family, user)).thenReturn(Optional.of(FamilyMember.builder().role(role).build()));
    }
    GrowthRecord record(UUID familyId) {
        Family f = new Family(); f.setId(familyId);
        GrowthRecord r = new GrowthRecord(); r.setId(id); r.setFamily(f);
        when(records.findById(id)).thenReturn(Optional.of(r));
        return r;
    }
    @Test void viewerCannotEditOrDelete() {
        role(FamilyMember.Role.VIEWER);
        assertThrows(AccessDeniedException.class, () -> service.deleteGrowth(id, user, family));
        assertThrows(AccessDeniedException.class, () -> service.updateGrowth(id, new GrowthRecordRequest(null, null), user, family));
        verifyNoInteractions(records);
    }
    @Test void parentCannotMutateAnotherBaby() {
        role(FamilyMember.Role.PARENT); record(UUID.randomUUID());
        assertThrows(AccessDeniedException.class, () -> service.deleteGrowth(id, user, family));
        assertThrows(AccessDeniedException.class, () -> service.updateGrowth(id, new GrowthRecordRequest(null, null), user, family));
        verify(records, never()).delete(any());
        verify(records, never()).save(any());
    }
    @Test void parentCanDeleteOwnBabyRecord() {
        role(FamilyMember.Role.PARENT); GrowthRecord r = record(family);
        service.deleteGrowth(id, user, family);
        verify(records).delete(r);
    }
    @Test void emptyUpdateCannotEraseBothMeasurements() {
        role(FamilyMember.Role.ADMIN); record(family);
        assertThrows(IllegalArgumentException.class, () -> service.updateGrowth(id, new GrowthRecordRequest(null, null), user, family));
        verify(records, never()).save(any());
    }
    @Test void updateKeepsMeasurementDateAndRecalculatesAtOriginalAge() {
        role(FamilyMember.Role.PARENT); GrowthRecord r = record(family);
        r.setAgeDays(120);
        var date = r.getRecordedAt();
        var value = new java.math.BigDecimal("6.5");
        when(who.assessWeight(120, value, "MALE")).thenReturn(new WhoGrowthUtil.Assessment("NORMAL", 0.2, 58, 6, "WHO"));
        when(who.assessHeight(120, null, "MALE")).thenReturn(new WhoGrowthUtil.Assessment("NORMAL", 0, 50, 60, "WHO"));
        when(records.save(r)).thenReturn(r);
        when(records.findByFamilyIdOrderByRecordedAtDesc(eq(family), any())).thenReturn(org.springframework.data.domain.Page.empty());
        service.updateGrowth(id, new GrowthRecordRequest(value, null), user, family);
        assertEquals(date, r.getRecordedAt());
        assertEquals(120, r.getAgeDays());
        assertEquals(value, r.getWeightKg());
        assertEquals(58.0, r.getWeightPercentile());
        assertNull(r.getHeightPercentile());
        verify(records).save(r);
    }
}
