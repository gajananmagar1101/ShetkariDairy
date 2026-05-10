package com.dairy.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
@CompoundIndexes({
    @CompoundIndex(name = "payment_user_customer_idx", def = "{'userId': 1, 'customerId': 1}"),
    @CompoundIndex(name = "payment_user_payment_date_idx", def = "{'userId': 1, 'paymentDate': -1}"),
    @CompoundIndex(name = "payment_user_created_idx", def = "{'userId': 1, 'createdAt': -1}")
})
public class Payment {
    @Indexed
    private String userId;


    @Id
    private String id;

    private String customerId;

    private BigDecimal amount;

    private LocalDate paymentDate;

    private LocalDate paidFromDate;

    private LocalDate paidToDate;

    private String paymentMethod; // e.g. UPI, CASH, BANK_TRANSFER

    private String transactionId;

    private PaymentStatus status;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
