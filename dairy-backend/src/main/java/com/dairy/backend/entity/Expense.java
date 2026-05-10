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
@Document(collection = "expenses")
@CompoundIndexes({
    @CompoundIndex(name = "expense_user_date_idx", def = "{'userId': 1, 'date': -1}"),
    @CompoundIndex(name = "expense_user_created_idx", def = "{'userId': 1, 'createdAt': -1}")
})
public class Expense {
    @Indexed
    private String userId;

    @Id
    private String id;
    private String category; // FEED, MEDICINE, ELECTRICITY, TRANSPORT, OTHER
    private String description;
    private BigDecimal amount;
    private LocalDate date;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
