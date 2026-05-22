package com.dairy.backend.repository;

import com.dairy.backend.entity.LabourRecovery;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LabourRecoveryRepository extends MongoRepository<LabourRecovery, String> {
    List<LabourRecovery> findByUserIdOrderByRecoveryDateDescCreatedAtDesc(String userId);
    List<LabourRecovery> findByUserIdAndWorkerIdAndRecoveryDateBetween(String userId, String workerId, LocalDate startDate, LocalDate endDate);
    void deleteByUserIdAndWorkerId(String userId, String workerId);
}
