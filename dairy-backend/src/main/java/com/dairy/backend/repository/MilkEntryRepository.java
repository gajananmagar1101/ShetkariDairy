package com.dairy.backend.repository;

import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MilkEntryRepository extends MongoRepository<MilkEntry, String> {
    List<MilkEntry> findByCustomerIdAndDateBetween(String customerId, LocalDate startDate, LocalDate endDate);
    List<MilkEntry> findByDateBetween(LocalDate startDate, LocalDate endDate);
    List<MilkEntry> findByDate(LocalDate date);
    boolean existsByCustomerIdAndDate(String customerId, LocalDate date);
    void deleteByCustomerId(String customerId);
}
