package com.dairy.backend.repository;

import com.dairy.backend.entity.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;
import org.springframework.data.domain.Sort;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
List<Payment> findByUserIdAndCustomerId(String userId, String customerId);
void deleteByUserIdAndCustomerId(String userId, String customerId);
List<Payment> findByUserId(String userId, Sort sort);
List<Payment> findByUserIdIn(Collection<String> userIds, Sort sort);
}
