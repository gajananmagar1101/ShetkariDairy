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
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "milk_entries")
@CompoundIndexes({
    @CompoundIndex(name = "user_date_idx", def = "{'userId': 1, 'date': 1}"),
    @CompoundIndex(name = "user_customer_idx", def = "{'userId': 1, 'customerId': 1}")
})
public class MilkEntry {
    @Indexed
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
