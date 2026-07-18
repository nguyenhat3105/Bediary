package com.bediary.service;

import com.bediary.dto.ProfileResponse;
import com.bediary.dto.UpdateProfileRequest;
import com.bediary.entity.Family;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.FamilyRepository;
import com.bediary.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final MediaStorageService mediaStorageService;
    private final UploadValidationService uploadValidationService;

    public ProfileService(UserRepository userRepository,
                           FamilyRepository familyRepository,
                           FamilyMemberRepository familyMemberRepository,
                           MediaStorageService mediaStorageService,
                           UploadValidationService uploadValidationService) {
        this.userRepository = userRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.mediaStorageService = mediaStorageService;
        this.uploadValidationService = uploadValidationService;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId, UUID familyId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Family family = null;
        String inviteCode = null;
        String babyName = null;
        String babyAvatarUrl = null;
        LocalDate babyDob = null;
        String babyGender = null;
        String babyAgeText = null;
        String currentUserRole = null;
        List<ProfileResponse.MemberInfo> members = List.of();

        if (familyId != null) {
            family = familyRepository.findById(familyId).orElse(null);
        }

        if (family != null) {
            inviteCode = family.getInviteCode();
            babyName = family.getBabyName();
            babyAvatarUrl = mediaStorageService.resolveUrl(family.getBabyAvatarStoragePath(), family.getBabyAvatarUrl());
            babyDob = family.getBabyDob();
            babyGender = family.getBabyGender() != null ? family.getBabyGender().name() : null;
            babyAgeText = calcAge(babyDob);

            List<FamilyMember> allMembers = familyMemberRepository.findByFamilyId(familyId);

            // Find current user role
            currentUserRole = allMembers.stream()
                    .filter(m -> m.getUser().getId().equals(userId))
                    .map(m -> m.getRole().name())
                    .findFirst().orElse("VIEWER");

            members = allMembers.stream()
                    .map(m -> {
                        String roleLabel = switch (m.getRole()) {
                            case ADMIN     -> "Quản trị hệ thống";
                            case PARENT    -> "Ba mẹ";
                            case CAREGIVER -> "Người chăm sóc";
                            case VIEWER    -> "Người thân";
                        };
                        return new ProfileResponse.MemberInfo(
                                m.getUser().getId(),
                                m.getUser().getFullName(),
                                mediaStorageService.resolveUrl(m.getUser().getAvatarStoragePath(), m.getUser().getAvatarUrl()),
                                m.getRole().name(),
                                roleLabel
                        );
                    }).toList();
        }

        return new ProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                mediaStorageService.resolveUrl(user.getAvatarStoragePath(), user.getAvatarUrl()),
                user.getCreatedAt(),
                babyName,
                babyAvatarUrl,
                babyDob,
                babyGender,
                babyAgeText,
                family != null ? family.getId() : null,
                inviteCode,
                currentUserRole,
                members
        );
    }

    @Transactional
    public ProfileResponse updateProfile(UUID userId, UUID familyId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }
        if (req.avatarUrl() != null) {
            user.setAvatarUrl(req.avatarUrl());
        }
        userRepository.save(user);
        return getProfile(userId, familyId);
    }

    @Transactional
    public ProfileResponse updateAvatar(UUID userId, UUID familyId, MultipartFile file) throws IOException {
        uploadValidationService.requireImage(file, "Avatar phải là một ảnh hợp lệ.");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StoredFile storedFile = mediaStorageService.upload(file, "avatars/" + userId, "avatar");
        user.setAvatarUrl(storedFile.storageRef());
        user.setAvatarStoragePath(storedFile.storageRef());
        userRepository.save(user);
        return getProfile(userId, familyId);
    }

    private String calcAge(LocalDate dob) {
        if (dob == null) return "";
        Period p = Period.between(dob, LocalDate.now());
        if (p.getYears() > 0) return p.getYears() + " tuổi " + p.getMonths() + " tháng";
        if (p.getMonths() > 0) return p.getMonths() + " tháng " + p.getDays() + " ngày";
        return p.getDays() + " ngày tuổi";
    }
}
