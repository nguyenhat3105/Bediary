package com.bediary.dto;

import java.util.List;

public record NotificationPageResponse(
        List<NotificationResponse> content,
        long unreadCount,
        int totalPages,
        long totalElements,
        int currentPage
) {}
