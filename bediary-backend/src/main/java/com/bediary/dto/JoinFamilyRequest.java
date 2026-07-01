package com.bediary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinFamilyRequest(
        @NotBlank @Size(max = 20) String inviteCode
) {}
