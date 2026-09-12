package com.bediary.service;

import com.bediary.entity.FamilyMember;
import com.bediary.repository.FamilyMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ViewerMedicalAccessTest {
    @Mock FamilyMemberRepository members;
    @InjectMocks GrowthService growth;
    @InjectMocks VaccinationService vaccinations;
    @InjectMocks HealthRecordService health;
    @InjectMocks HealthSubjectService subjects;

    @Test void viewerCannotWriteMedicalData() {
        UUID userId = UUID.randomUUID(), familyId = UUID.randomUUID();
        when(members.findByFamilyIdAndUserId(familyId, userId)).thenReturn(Optional.of(
                FamilyMember.builder().role(FamilyMember.Role.VIEWER).build()));
        assertThrows(AccessDeniedException.class, () -> ReflectionTestUtils.invokeMethod(vaccinations, "requireParentManager", userId, familyId));
        assertThrows(AccessDeniedException.class, () -> ReflectionTestUtils.invokeMethod(health, "requireWriter", userId, familyId));
        var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> ReflectionTestUtils.invokeMethod(subjects, "requireWriter", userId, familyId));
        assertEquals(403, error.getStatusCode().value());
        assertEquals(false, ReflectionTestUtils.invokeMethod(growth, "canManageMedicalData", FamilyMember.Role.VIEWER));
    }
}
