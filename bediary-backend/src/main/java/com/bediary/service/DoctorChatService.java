package com.bediary.service;

import com.bediary.dto.DoctorChatMessageRequest;
import com.bediary.dto.DoctorChatMessageResponse;
import com.bediary.entity.DoctorChatMessage;
import com.bediary.entity.FamilyMember;
import com.bediary.repository.DoctorChatMessageRepository;
import com.bediary.repository.FamilyMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DoctorChatService {

    private final DoctorChatMessageRepository doctorChatMessageRepository;
    private final FamilyMemberRepository familyMemberRepository;

    @Transactional(readOnly = true)
    public List<DoctorChatMessageResponse> getMessages(UUID familyId, UUID userId) {
        requireChatMember(familyId, userId);
        return doctorChatMessageRepository.findTop80ByFamilyIdOrderByCreatedAtAsc(familyId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DoctorChatMessageResponse sendMessage(UUID familyId, UUID userId, DoctorChatMessageRequest request) {
        FamilyMember member = requireChatMember(familyId, userId);
        DoctorChatMessage message = new DoctorChatMessage();
        message.setFamily(member.getFamily());
        message.setSender(member.getUser());
        message.setSenderRole(member.getRole() == FamilyMember.Role.DOCTOR
                ? DoctorChatMessage.SenderRole.DOCTOR
                : DoctorChatMessage.SenderRole.FAMILY);
        message.setContent(request.content().trim());
        return toResponse(doctorChatMessageRepository.save(message));
    }

    private FamilyMember requireChatMember(UUID familyId, UUID userId) {
        FamilyMember member = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bạn chưa thuộc hồ sơ gia đình này"));
        if (member.getRole() == FamilyMember.Role.VIEWER) {
            throw new AccessDeniedException("Tài khoản này chỉ có quyền xem, chưa thể chat với bác sĩ");
        }
        return member;
    }

    private DoctorChatMessageResponse toResponse(DoctorChatMessage message) {
        return new DoctorChatMessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getFullName(),
                message.getSenderRole().name(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
