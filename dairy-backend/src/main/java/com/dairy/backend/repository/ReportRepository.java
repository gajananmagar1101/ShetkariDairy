package com.dairy.backend.repository;

import com.dairy.backend.entity.Report;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {
List<Report> findByUserIdAndTypeAndReportDateBetween(String userId, String type, LocalDate startDate, LocalDate endDate);
    List<Report> findByUserId(String userId);
}
