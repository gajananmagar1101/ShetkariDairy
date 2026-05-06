package com.dairy.backend.repository;

import com.dairy.backend.entity.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    List<Invoice> findByCustomerId(String customerId);
    List<Invoice> findByInvoiceMonthAndInvoiceYear(Integer month, Integer year);
    void deleteByCustomerId(String customerId);
}
