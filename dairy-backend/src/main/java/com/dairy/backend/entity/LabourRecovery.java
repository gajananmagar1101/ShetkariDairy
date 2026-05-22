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
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "labour_recoveries")
@CompoundIndexes({
        @CompoundIndex(name = "labour_recovery_user_worker_date_idx", def = "{'userId': 1, 'workerId': 1, 'recoveryDate': -1}")
})
public class LabourRecovery {

    @Id
    private String id;

    private String userId;

    private String workerId;

    private LocalDate recoveryDate;

    private BigDecimal amount;

    private String paymentMethod;

    private String notes;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
