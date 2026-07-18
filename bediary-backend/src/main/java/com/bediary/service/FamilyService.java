package com.bediary.service;

import com.bediary.dto.CreateFamilyRequest;
import com.bediary.dto.BabyJournalResponse;
import com.bediary.dto.FamilyResponse;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.UserRepository;
import com.bediary.repository.GrowthRecordRepository;
import com.bediary.repository.HealthRecordRepository;
import com.bediary.repository.MediaPostRepository;
import com.bediary.repository.NotificationRepository;
import com.bediary.repository.PostCommentRepository;
import com.bediary.repository.PostReactionRepository;
import com.bediary.repository.RoutineLogRepository;
import com.bediary.repository.RoutineRepository;
import com.bediary.repository.TrackingLogRepository;
import com.bediary.repository.UserStreakRepository;
import com.bediary.repository.VaccinationRecordRepository;
import com.bediary.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FamilyService {

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final MediaPostRepository mediaPostRepository;
    private final RoutineLogRepository routineLogRepository;
    private final RoutineRepository routineRepository;
    private final TrackingLogRepository trackingLogRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final VaccinationRecordRepository vaccinationRecordRepository;
    private final NotificationRepository notificationRepository;
    private final UserStreakRepository userStreakRepository;
    private final MediaStorageService mediaStorageService;
    private final UploadValidationService uploadValidationService;

    @Transactional
    public FamilyResponse createFamily(CreateFamilyRequest request, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        String inviteCode = generateInviteCode();

        Family family = Family.builder()
                .babyName(request.babyName())
                .babyDob(request.babyDob())
                .babyGender(request.babyGender())
                .inviteCode(inviteCode)
                .build();

        family = familyRepository.save(family);

        // Creator is the parent of this baby journal.
        // CAREGIVER is for relatives who are allowed to help with care logs.
        FamilyMember member = FamilyMember.builder()
                .family(family)
                .user(user)
                .role(FamilyMember.Role.PARENT)
                .build();

        familyMemberRepository.save(member);

        // FIX: Generate a new JWT that now contains the correct familyId.
        // The old token (from register) had familyId=null, causing 403 on tracking.
        String newToken = jwtUtil.generateToken(user.getId(), family.getId(), user.getEmail());

        return new FamilyResponse(family.getId(), family.getBabyName(), family.getInviteCode(), newToken);
    }

    @Transactional
    public FamilyResponse joinFamily(String inviteCode, UUID userId) {
        Family family = familyRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code: " + inviteCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        // Prevent duplicate membership
        if (familyMemberRepository.existsByFamilyIdAndUserId(family.getId(), userId)) {
            throw new IllegalStateException("User is already a member of this family");
        }

        // Joiners via invite code become VIEWERs
        FamilyMember member = FamilyMember.builder()
                .family(family)
                .user(user)
                .role(FamilyMember.Role.VIEWER)
                .build();

        familyMemberRepository.save(member);

        // FIX: Generate new JWT with familyId so VIEWER can access the feed properly.
        String newToken = jwtUtil.generateToken(user.getId(), family.getId(), user.getEmail());

        return new FamilyResponse(family.getId(), family.getBabyName(), null, newToken);
    }

    @Transactional(readOnly = true)
    public List<BabyJournalResponse> getMyJournals(UUID userId, UUID activeFamilyId) {
        return familyMemberRepository.findByUserId(userId)
                .stream()
                .map(member -> {
                    Family family = member.getFamily();
                    return new BabyJournalResponse(
                            family.getId(),
                            family.getBabyName(),
                            mediaStorageService.resolveUrl(family.getBabyAvatarStoragePath(), family.getBabyAvatarUrl()),
                            family.getBabyDob(),
                            family.getBabyGender() != null ? family.getBabyGender().name() : null,
                            member.getRole().name(),
                            family.getId().equals(activeFamilyId)
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public FamilyResponse switchFamily(UUID targetFamilyId, UUID userId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(targetFamilyId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this baby journal"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
        Family family = member.getFamily();
        String newToken = jwtUtil.generateToken(user.getId(), family.getId(), user.getEmail());
        return new FamilyResponse(family.getId(), family.getBabyName(), family.getInviteCode(), newToken);
    }

    @Transactional
    public BabyJournalResponse updateBabyAvatar(UUID familyId, UUID userId, MultipartFile file) throws IOException {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this baby journal"));
        if (!isParentOrAdmin(member.getRole())) {
            throw new AccessDeniedException("Chỉ Ba mẹ mới có thể cập nhật ảnh bé");
        }
        uploadValidationService.requireImage(file, "Avatar của bé phải là một ảnh hợp lệ.");

        Family family = member.getFamily();
        StoredFile storedFile = mediaStorageService.upload(file, "babies/" + familyId, "baby-avatar");
        family.setBabyAvatarUrl(storedFile.storageRef());
        family.setBabyAvatarStoragePath(storedFile.storageRef());
        familyRepository.save(family);

        return new BabyJournalResponse(
                family.getId(),
                family.getBabyName(),
                mediaStorageService.resolveUrl(family.getBabyAvatarStoragePath(), family.getBabyAvatarUrl()),
                family.getBabyDob(),
                family.getBabyGender() != null ? family.getBabyGender().name() : null,
                member.getRole().name(),
                true
        );
    }

    @Transactional
    public void deleteFamily(UUID familyId, UUID userId) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        FamilyMember membership = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of this family"));
        if (!isParentOrAdmin(membership.getRole())) {
            throw new AccessDeniedException("Chỉ Ba mẹ mới có thể xóa gia đình");
        }

        postReactionRepository.deleteByPostFamilyId(familyId);
        postCommentRepository.deleteByPostFamilyId(familyId);
        mediaPostRepository.deleteByFamilyId(familyId);
        routineLogRepository.deleteByFamilyId(familyId);
        routineRepository.deleteByFamilyId(familyId);
        trackingLogRepository.deleteByFamilyId(familyId);
        healthRecordRepository.deleteByFamilyId(familyId);
        growthRecordRepository.deleteByFamilyId(familyId);
        vaccinationRecordRepository.deleteByFamilyId(familyId);
        notificationRepository.deleteByFamilyId(familyId);
        userStreakRepository.deleteByFamilyId(familyId);
        familyMemberRepository.deleteByFamilyId(familyId);
        familyRepository.delete(family);
        deleteFamilyUploads(familyId);
    }

    @Transactional(readOnly = true)
    public UUID getCurrentSessionFamilyId(UUID userId) {
        return familyMemberRepository.findFirstByUserId(userId)
                .map(member -> member.getFamily().getId())
                .orElseThrow(() -> new IllegalStateException("User has not joined any family yet"));
    }

    private void deleteFamilyUploads(UUID familyId) {
        try {
            mediaStorageService.deleteLocalFamilyFolders(familyId);
        } catch (IOException e) {
            throw new IllegalStateException("Family data deleted, but media files could not be fully removed");
        }
    }

    private String generateInviteCode() {
        String code;
        do {
            code = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        } while (familyRepository.findByInviteCode(code).isPresent());
        return code;
    }

    /** PARENT manages the family; ADMIN is reserved for system operations. */
    private boolean isParentOrAdmin(FamilyMember.Role role) {
        return role == FamilyMember.Role.PARENT || role == FamilyMember.Role.ADMIN;
    }
}
