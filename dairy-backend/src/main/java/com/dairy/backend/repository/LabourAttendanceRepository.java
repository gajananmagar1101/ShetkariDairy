package com.dairy.backend.repository;

import com.dairy.backend.entity.LabourAttendance;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabourAttendanceRepository extends MongoRepository<LabourAttendance, String> {
    List<LabourAttendance> findByUserIdAndDate(String userId, LocalDate date);
    List<LabourAttendance> findByUserIdAndWorkerId(String userId, String workerId);
    List<LabourAttendance> findByUserIdAndWorkerIdAndDateBetween(String userId, String workerId, LocalDate startDate, LocalDate endDate);
    Optional<LabourAttendance> findByUserIdAndWorkerIdAndDate(String userId, String workerId, LocalDate date);
    void deleteByUserIdAndWorkerId(String userId, String workerId);
}
