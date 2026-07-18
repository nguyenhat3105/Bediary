package com.bediary.controller;

import com.bediary.dto.AuthResponse;
import com.bediary.dto.AuthSession;
import com.bediary.dto.CurrentSessionResponse;
import com.bediary.dto.LoginRequest;
import com.bediary.dto.RegisterRequest;
import com.bediary.security.JwtUtil;
import com.bediary.service.AuthService;
import com.bediary.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    @Value("${bediary.auth.refresh-token.cookie-name:bediary_refresh_token}")
    private String refreshCookieName;

    @Value("${bediary.auth.refresh-token.cookie-secure:false}")
    private boolean refreshCookieSecure;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthSession session = authService.register(request);
        return withRefreshCookie(session);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthSession session = authService.login(request);
        return withRefreshCookie(session);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(
            @CookieValue(name = "${bediary.auth.refresh-token.cookie-name:bediary_refresh_token}", required = false)
            String refreshToken
    ) {
        if (!StringUtils.hasText(refreshToken)) {
            throw new IllegalArgumentException("Refresh token cookie is required");
        }
        AuthSession session = authService.refresh(refreshToken);
        return withRefreshCookie(session);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "${bediary.auth.refresh-token.cookie-name:bediary_refresh_token}", required = false)
            String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentSessionResponse> me(HttpServletRequest httpRequest) {
        UUID userId = jwtUtil.extractUserId(extractToken(httpRequest));
        return ResponseEntity.ok(authService.getCurrentSession(userId));
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthSession session) {
        return ResponseEntity.ok()
                // HttpOnly keeps JS from reading refresh token, reducing XSS session theft impact.
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken()).toString())
                .body(session.response());
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(refreshCookieName, token)
                .httpOnly(true)
                .secure(refreshCookieSecure) // Use true in production HTTPS. Keep false locally if testing over http://localhost.
                .sameSite("Strict") // Blocks cross-site cookie sending to reduce CSRF exposure.
                .path("/api/v1/auth")
                .maxAge(refreshTokenService.refreshTtl())
                .build();
    }

    private ResponseCookie expiredRefreshCookie() {
        return ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ZERO)
                .build();
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        throw new IllegalArgumentException("Authorization token required");
    }
}
