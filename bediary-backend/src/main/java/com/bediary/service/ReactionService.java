package com.bediary.service;

import com.bediary.dto.PostReactionResponse;
import com.bediary.entity.*;
import com.bediary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReactionService {

    private final PostReactionRepository postReactionRepository;
    private final MediaPostRepository mediaPostRepository;
    private final UserRepository userRepository;

    /**
     * Toggle reaction: if the user has already reacted, remove it; otherwise add it.
     * Updates the denormalized reaction_count on MediaPost.
     */
    @Transactional
    public PostReactionResponse toggleReaction(UUID postId, UUID userId, UUID familyId) {
        MediaPost post = mediaPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        if (!post.getFamily().getId().equals(familyId)) {
            throw new IllegalArgumentException("Post not found in your family");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Optional<PostReaction> existing = postReactionRepository.findByPostIdAndUserId(postId, userId);
        boolean reacted;

        if (existing.isPresent()) {
            postReactionRepository.delete(existing.get());
            post.setReactionCount(Math.max(0, post.getReactionCount() - 1));
            reacted = false;
        } else {
            PostReaction reaction = PostReaction.builder()
                    .post(post)
                    .user(user)
                    .build();
            postReactionRepository.save(reaction);
            post.setReactionCount(post.getReactionCount() + 1);
            reacted = true;
        }

        mediaPostRepository.save(post);

        return new PostReactionResponse(postId, reacted, post.getReactionCount());
    }
}
