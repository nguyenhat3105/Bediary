package com.bediary.controller;

import com.bediary.dto.AuthResponse;
import com.bediary.dto.CurrentSessionResponse;
import com.bediary.dto.LoginRequest;
import com.bediary.dto.RegisterRequest;
import com.bediary.security.JwtUtil;
import com.bediary.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    /**
     * POST /api/v1/auth/register
     * Body: { email, password, full_name }
     * Response: { token, user_id }
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * POST /api/v1/auth/login
     * Body: { email, password }
     * Response: { token, user_id }
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentSessionResponse> me(HttpServletRequest httpRequest) {
        UUID userId = jwtUtil.extractUserId(extractToken(httpRequest));
        return ResponseEntity.ok(authService.getCurrentSession(userId));
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new IllegalArgumentException("Authorization token required");
    }
}
