package com.bediary.repository;

import com.bediary.entity.CareTip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CareTipRepository extends JpaRepository<CareTip, UUID> {

    /**
     * Returns all tips applicable for a given age in days.
     * A tip is applicable when startDay <= ageDays <= endDay.
     */
    List<CareTip> findByStartDayLessThanEqualAndEndDayGreaterThanEqual(int startDay, int endDay);
}
