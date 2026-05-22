package com.dairy.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabourRecoveryDto {
    private String id;
    private String workerId;
    private String workerName;
    private LocalDate recoveryDate;
    private BigDecimal amount;
    private String paymentMethod;
    private String notes;
}
