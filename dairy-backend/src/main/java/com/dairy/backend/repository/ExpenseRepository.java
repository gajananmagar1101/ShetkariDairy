package com.dairy.backend.repository;

import com.dairy.backend.entity.Expense;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends MongoRepository<Expense, String> {
    List<Expense> findByDateBetween(LocalDate startDate, LocalDate endDate);
}
