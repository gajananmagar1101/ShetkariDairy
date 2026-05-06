package com.dairy.backend.repository;

import com.dairy.backend.entity.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByCustomerId(String customerId);
    void deleteByCustomerId(String customerId);
}
