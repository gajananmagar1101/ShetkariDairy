package com.dairy.backend.repository;

import com.dairy.backend.entity.Attendance;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findByWorkerIdAndDateBetween(String workerId, LocalDate startDate, LocalDate endDate);
    List<Attendance> findByDate(LocalDate date);
}
