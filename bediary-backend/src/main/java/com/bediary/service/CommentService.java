package com.bediary.service;

import com.bediary.dto.PostCommentRequest;
import com.bediary.dto.PostCommentResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final PostCommentRepository postCommentRepository;
    private final MediaPostRepository mediaPostRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final MediaStorageService mediaStorageService;

    @Transactional
    public PostCommentResponse addComment(UUID postId, PostCommentRequest request, UUID userId, UUID familyId) {
        MediaPost post = mediaPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        if (!post.getFamily().getId().equals(familyId)) {
            throw new IllegalArgumentException("Post not found in your family");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        PostComment comment = PostComment.builder()
                .post(post)
                .user(user)
                .content(request.content().trim())
                .build();

        post.setCommentCount(post.getCommentCount() + 1);
        mediaPostRepository.save(post);

        return toResponse(postCommentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<PostCommentResponse> getComments(UUID postId, UUID familyId) {
        MediaPost post = mediaPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        if (!post.getFamily().getId().equals(familyId)) {
            throw new IllegalArgumentException("Post not found in your family");
        }
        return postCommentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public void deleteComment(UUID postId, UUID commentId, UUID userId, UUID familyId) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (!comment.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }
        if (!comment.getPost().getFamily().getId().equals(familyId)) {
            throw new IllegalArgumentException("Comment not found in your family");
        }

        boolean isOwner = comment.getUser().getId().equals(userId);
        boolean canModerate = familyMemberRepository.findByFamilyIdAndUserId(familyId, userId)
                .map(m -> m.getRole() == FamilyMember.Role.PARENT
                        || m.getRole() == FamilyMember.Role.CAREGIVER
                        || m.getRole() == FamilyMember.Role.ADMIN)
                .orElse(false);

        if (!isOwner && !canModerate) {
            throw new AccessDeniedException("You can only delete your own comments");
        }

        // Update denormalized count
        MediaPost post = comment.getPost();
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        mediaPostRepository.save(post);

        postCommentRepository.delete(comment);
    }

    private PostCommentResponse toResponse(PostComment c) {
        return new PostCommentResponse(
                c.getId(),
                c.getContent(),
                c.getUser().getId(),
                c.getUser().getFullName(),
                mediaStorageService.resolveUrl(c.getUser().getAvatarStoragePath(), c.getUser().getAvatarUrl()),
                c.getCreatedAt()
        );
    }
}
