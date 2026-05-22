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
@Document(collection = "labour_workers")
@CompoundIndexes({
        @CompoundIndex(name = "labour_worker_user_phone_idx", def = "{'userId': 1, 'phone': 1}", unique = true)
})
public class LabourWorker {

    @Id
    private String id;

    private String userId;

    private String name;

    private String phone;

    private String address;

    private String workType;

    private LocalDate joinDate;

    private LocalDate contractStartDate;

    private BigDecimal contractAmount;

    private BigDecimal upfrontPaidAmount;

    private LocalDate upfrontPaidDate;

    private boolean active;

    private String notes;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
