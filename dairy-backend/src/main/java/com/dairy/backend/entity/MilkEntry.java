package com.dairy.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "milk_entries")
public class MilkEntry {
    private String userId;


    private String id;

    private String customerId;

    private LocalDate date;

    @Builder.Default
    private BigDecimal morningQuantity = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal eveningQuantity = BigDecimal.ZERO;

    private BigDecimal fat;

    private BigDecimal snf;

    private BigDecimal ratePerLiter;

    private BigDecimal totalAmount;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
