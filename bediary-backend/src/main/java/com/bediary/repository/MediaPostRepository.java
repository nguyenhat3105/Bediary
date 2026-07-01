package com.bediary.repository;

import com.bediary.entity.MediaPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MediaPostRepository extends JpaRepository<MediaPost, UUID> {

    /**
     * Returns paginated media posts for a family.
     * family_id is always filtered — backend extracts it from JWT, never from request param.
     */
    Page<MediaPost> findByFamilyIdOrderByCreatedAtDesc(UUID familyId, Pageable pageable);

    void deleteByFamilyId(UUID familyId);
}
