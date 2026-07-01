package com.bediary.service;

import com.bediary.dto.AuthResponse;
import com.bediary.dto.CurrentSessionResponse;
import com.bediary.dto.LoginRequest;
import com.bediary.dto.RegisterRequest;
import com.bediary.entity.FamilyMember;
import com.bediary.entity.User;
import com.bediary.repository.FamilyMemberRepository;
import com.bediary.repository.UserRepository;
import com.bediary.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
        // New user has no family yet — familyId is null in token
        String token = jwtUtil.generateToken(user.getId(), null, user.getEmail());

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), null, user.getIsPremium());
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password()));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Resolve the user's primary family (if any)
        UUID familyId = familyMemberRepository.findFirstByUserId(user.getId())
                .map(fm -> fm.getFamily().getId())
                .orElse(null);

        String token = jwtUtil.generateToken(user.getId(), familyId, user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), familyId, user.getIsPremium());
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
                user.getIsPremium(),
                membership != null ? membership.getFamily().getId() : null,
                membership != null ? membership.getFamily().getBabyName() : null,
                membership != null ? membership.getRole().name() : null
        );
    }
}
