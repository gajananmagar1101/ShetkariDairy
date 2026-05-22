package com.dairy.backend.repository;

import com.dairy.backend.entity.LabourWorker;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabourWorkerRepository extends MongoRepository<LabourWorker, String> {
    List<LabourWorker> findByUserIdOrderByActiveDescNameAsc(String userId);
    List<LabourWorker> findByUserIdAndActiveTrueOrderByNameAsc(String userId);
    Optional<LabourWorker> findByUserIdAndPhone(String userId, String phone);
    Optional<LabourWorker> findByIdAndUserId(String id, String userId);
    void deleteByIdAndUserId(String id, String userId);
}
