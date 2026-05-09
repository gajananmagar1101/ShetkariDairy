package com.dairy.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "invoices")
public class Invoice {
    @Indexed
    private String userId;


    @Id
    private String id;

    private String customerId;

    private LocalDate periodStartDate;

    private LocalDate periodEndDate;

    private Integer invoiceMonth;

    private Integer invoiceYear;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private PaymentStatus status;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
