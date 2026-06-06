package com.dairy.backend.repository;

import com.dairy.backend.entity.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;
import org.springframework.data.domain.Sort;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {
List<Invoice> findByUserIdAndCustomerId(String userId, String customerId);
List<Invoice> findByUserIdAndInvoiceMonthAndInvoiceYear(String userId, Integer month, Integer year);
void deleteByUserIdAndCustomerId(String userId, String customerId);
    List<Invoice> findByUserId(String userId, org.springframework.data.domain.Sort sort);
List<Invoice> findByUserIdIn(Collection<String> userIds, Sort sort);
}
