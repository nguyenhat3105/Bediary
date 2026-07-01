package com.bediary.dto;

import java.util.UUID;

/**
 * familyId, babyName, inviteCode được trả về sau khi create/join.
 * newToken: JWT mới đã chứa familyId — frontend phải lưu lại để gọi các API sau.
 */
public record FamilyResponse(
        UUID familyId,
        String babyName,
        String inviteCode,
        String newToken   // JWT mới với familyId đã được gắn
) {}
