package com.dairy.backend.repository;

import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface MilkEntryRepository extends MongoRepository<MilkEntry, String> {
List<MilkEntry> findByUserIdAndCustomerIdAndDateBetween(String userId, String customerId, LocalDate startDate, LocalDate endDate);
List<MilkEntry> findByUserIdAndCustomerId(String userId, String customerId);
List<MilkEntry> findByUserIdAndCustomerIdAndDate(String userId, String customerId, LocalDate date);
List<MilkEntry> findByUserIdInAndDateBetween(Collection<String> userIds, LocalDate startDate, LocalDate endDate);
List<MilkEntry> findByUserIdAndDateBetween(String userId, LocalDate startDate, LocalDate endDate);
List<MilkEntry> findByUserIdAndDate(String userId, LocalDate date);
List<MilkEntry> findByUserIdInAndDate(Collection<String> userIds, LocalDate date);
boolean existsByUserIdAndCustomerIdAndDate(String userId, String customerId, LocalDate date);
boolean existsByUserIdInAndCustomerIdAndDate(Collection<String> userIds, String customerId, LocalDate date);
void deleteByUserIdAndCustomerId(String userId, String customerId);
    List<MilkEntry> findByUserId(String userId);
}
