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
public class LabourWorkerDto {
    private String id;
    private String name;
    private String phone;
    private String address;
    private String workType;
    private LocalDate joinDate;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private BigDecimal contractAmount;
    private BigDecimal upfrontPaidAmount;
    private LocalDate upfrontPaidDate;
    private Boolean active;
    private String notes;
    private BigDecimal dailyRate;
    private Long totalAbsentDays;
    private Long totalHalfDays;
    private BigDecimal totalDeduction;
    private BigDecimal totalRecovered;
    private BigDecimal pendingRecovery;
}
