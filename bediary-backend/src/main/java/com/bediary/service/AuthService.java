package com.bediary.service;

import com.bediary.dto.AuthResponse;
import com.bediary.dto.AuthSession;
import com.bediary.dto.CurrentSessionResponse;
import com.bediary.dto.LoginRequest;
import com.bediary.dto.RegisterRequest;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.UserRepository;
import com.bediary.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public AuthSession register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered: " + email);
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .build();

        user = userRepository.save(user);
        String accessToken = jwtUtil.generateToken(user.getId(), null, user.getEmail());
        String refreshToken = refreshTokenService.issue(user, null).rawToken();

        return new AuthSession(
                new AuthResponse(accessToken, user.getId(), user.getEmail(), user.getFullName(), null, null),
                refreshToken
        );
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản hoặc mật khẩu sai"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Sai mật khẩu");
        }

        FamilyMember membership = familyMemberRepository.findFirstByUserId(user.getId()).orElse(null);
        UUID familyId = membership != null ? membership.getFamily().getId() : null;
        String role = membership != null ? membership.getRole().name() : null;

        String accessToken = jwtUtil.generateToken(user.getId(), familyId, user.getEmail());
        String refreshToken = refreshTokenService.issue(user, familyId).rawToken();

        return new AuthSession(
                new AuthResponse(accessToken, user.getId(), user.getEmail(), user.getFullName(), familyId, role),
                refreshToken
        );
    }

    @Transactional
    public AuthSession refresh(String rawRefreshToken) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        User user = rotation.previousToken().getUser();
        UUID familyId = rotation.previousToken().getFamilyId();

        FamilyMember membership = familyId != null
                ? familyMemberRepository.findByFamilyIdAndUserId(familyId, user.getId()).orElse(null)
                : familyMemberRepository.findFirstByUserId(user.getId()).orElse(null);

        UUID resolvedFamilyId = membership != null ? membership.getFamily().getId() : null;
        String role = membership != null ? membership.getRole().name() : null;

        String accessToken = jwtUtil.generateToken(user.getId(), resolvedFamilyId, user.getEmail());
        return new AuthSession(
                new AuthResponse(accessToken, user.getId(), user.getEmail(), user.getFullName(), resolvedFamilyId, role),
                rotation.newRawToken()
        );
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    @Transactional(readOnly = true)
    public CurrentSessionResponse getCurrentSession(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        FamilyMember membership = familyMemberRepository.findFirstByUserId(userId).orElse(null);
        return new CurrentSessionResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                membership != null ? membership.getFamily().getId() : null,
                membership != null ? membership.getFamily().getBabyName() : null,
                membership != null ? membership.getRole().name() : null
        );
    }
}
