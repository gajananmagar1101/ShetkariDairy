package com.dairy.backend.repository;

import com.dairy.backend.entity.Customer;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface CustomerRepository extends MongoRepository<Customer, String> {
Optional<Customer> findByUserIdAndPhone(String userId, String phone);
long countByUserIdAndIsActiveTrue(String userId);
List<Customer> findByUserIdAndIsActiveTrue(String userId);
    List<Customer> findByUserId(String userId);
}
