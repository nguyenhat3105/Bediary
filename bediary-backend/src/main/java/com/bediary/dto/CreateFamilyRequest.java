package com.bediary.dto;

import com.bediary.entity.Family;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

public record CreateFamilyRequest(
        @NotBlank String babyName,
        @NotNull @PastOrPresent LocalDate babyDob,
        @NotNull Family.Gender babyGender
) {}
