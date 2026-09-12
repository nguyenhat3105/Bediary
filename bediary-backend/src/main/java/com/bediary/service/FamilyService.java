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
        Family source = null;
        FamilyMember.Role creatorRole = FamilyMember.Role.PARENT;
        if (request.existingFamilyId() != null) {
            FamilyMember manager = familyMemberRepository.findByFamilyIdAndUserId(request.existingFamilyId(), userId)
                    .orElseThrow(() -> new AccessDeniedException("Not a family member"));
            if (!isParentOrAdmin(manager.getRole())) throw new AccessDeniedException("Only parents can add a baby");
            source = manager.getFamily();
            creatorRole = manager.getRole();
            if (source.getHouseholdId() == null) source.setHouseholdId(source.getId());
        }

        Family family = Family.builder()
                .babyName(request.babyName())
                .babyDob(request.babyDob())
                .babyGender(request.babyGender())
                .inviteCode(inviteCode)
                .build();

        family.setHouseholdId(source == null ? UUID.randomUUID() : source.getHouseholdId());
        family = familyRepository.save(family);

        // Creator is the parent of this baby journal.
        // CAREGIVER is for relatives who are allowed to help with care logs.
        FamilyMember member = FamilyMember.builder()
                .family(family)
                .user(user)
                .role(creatorRole)
                .build();

        familyMemberRepository.save(member);
        if (source != null) {
            for (FamilyMember relative : familyMemberRepository.findByFamilyId(source.getId())) {
                if (!relative.getUser().getId().equals(userId)) {
                    familyMemberRepository.save(FamilyMember.builder().family(family).user(relative.getUser())
                            .role(relative.getRole()).build());
                }
            }
        }

        // FIX: Generate a new JWT that now contains the correct familyId.
        // The old token (from register) had familyId=null, causing 403 on tracking.
        String newToken = jwtUtil.generateToken(user.getId(), family.getId(), user.getEmail());

        return new FamilyResponse(family.getId(), family.getBabyName(), family.getInviteCode(), newToken, member.getRole().name());
    }

    @Transactional
    public FamilyResponse joinFamily(String inviteCode, UUID userId) {
        Family family = familyRepository.findByInviteCode(inviteCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code: " + inviteCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        // Rejoining restores the session without duplicating membership or changing its role.
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(family.getId(), userId)
                .orElseGet(() -> familyMemberRepository.save(FamilyMember.builder()
                .family(family)
                .user(user)
                .role(FamilyMember.Role.VIEWER)
                .build()));
        for (Family sibling : householdBabies(family)) {
            if (!sibling.getId().equals(family.getId())
                    && !familyMemberRepository.existsByFamilyIdAndUserId(sibling.getId(), userId)) {
                familyMemberRepository.save(FamilyMember.builder().family(sibling).user(user)
                        .role(member.getRole()).build());
            }
        }

        // FIX: Generate new JWT with familyId so VIEWER can access the feed properly.
        String newToken = jwtUtil.generateToken(user.getId(), family.getId(), user.getEmail());

        return new FamilyResponse(family.getId(), family.getBabyName(), null, newToken, member.getRole().name());
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
        return new FamilyResponse(family.getId(), family.getBabyName(), family.getInviteCode(), newToken, member.getRole().name());
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

    public List<Family> householdBabies(Family family) {
        return family.getHouseholdId() == null ? List.of(family)
                : familyRepository.findByHouseholdId(family.getHouseholdId());
    }

    @Transactional
    public void linkHouseholds(UUID currentId, UUID otherId, UUID actorId) {
        Family current = familyRepository.findById(currentId).orElseThrow();
        Family other = familyRepository.findById(otherId).orElseThrow();
        java.util.Map<UUID, Family> babies = new java.util.LinkedHashMap<>();
        householdBabies(current).forEach(baby -> babies.put(baby.getId(), baby));
        householdBabies(other).forEach(baby -> babies.put(baby.getId(), baby));
        // Linking exposes each baby's data to the combined membership: require management of every baby.
        for (Family baby : babies.values()) {
            FamilyMember manager = familyMemberRepository.findByFamilyIdAndUserId(baby.getId(), actorId)
                    .orElseThrow(() -> new AccessDeniedException("Not a parent of every baby"));
            if (!isParentOrAdmin(manager.getRole())) throw new AccessDeniedException("Only parents can link babies");
        }
        java.util.Map<UUID, FamilyMember> shared = new java.util.LinkedHashMap<>();
        for (Family baby : babies.values()) {
            for (FamilyMember member : familyMemberRepository.findByFamilyId(baby.getId())) {
                FamilyMember previous = shared.get(member.getUser().getId());
                if (previous != null && previous.getRole() != member.getRole())
                    throw new IllegalArgumentException("Thành viên có quyền khác nhau giữa các hồ sơ. Hãy thống nhất quyền trước khi gộp.");
                shared.put(member.getUser().getId(), member);
            }
        }
        UUID group = current.getHouseholdId() == null ? current.getId() : current.getHouseholdId();
        for (Family baby : babies.values()) {
            baby.setHouseholdId(group);
            for (FamilyMember member : shared.values()) {
                if (!familyMemberRepository.existsByFamilyIdAndUserId(baby.getId(), member.getUser().getId())) {
                    familyMemberRepository.save(FamilyMember.builder().family(baby).user(member.getUser()).role(member.getRole()).build());
                }
            }
        }
    }

    @Transactional
    public void updateHouseholdMember(UUID familyId, UUID actorId, UUID targetId, FamilyMember.Role role) {
        FamilyMember actor = familyMemberRepository.findByFamilyIdAndUserId(familyId, actorId)
                .orElseThrow(() -> new AccessDeniedException("Not a family member"));
        if (!isParentOrAdmin(actor.getRole()) || actorId.equals(targetId))
            throw new AccessDeniedException("Cannot manage this member");
        for (Family baby : householdBabies(actor.getFamily())) {
            familyMemberRepository.findByFamilyIdAndUserId(baby.getId(), targetId).ifPresent(target -> {
                if (isParentOrAdmin(target.getRole())) throw new AccessDeniedException("Cannot change parent/admin");
                if (role == null) familyMemberRepository.delete(target);
                else { target.setRole(role); familyMemberRepository.save(target); }
            });
        }
    }
}
