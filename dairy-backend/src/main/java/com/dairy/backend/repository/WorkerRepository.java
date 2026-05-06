package com.dairy.backend.repository;

import com.dairy.backend.entity.Worker;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkerRepository extends MongoRepository<Worker, String> {
    Optional<Worker> findByPhone(String phone);
}
