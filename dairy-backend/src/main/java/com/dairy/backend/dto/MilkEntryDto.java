package com.dairy.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MilkEntryDto {
    private String id;
    private String customerId;
    private String customerName; // We will populate this
    private LocalDate date;
    private BigDecimal morningQuantity;
    private BigDecimal eveningQuantity;
    private BigDecimal fat;
    private BigDecimal snf;
    private BigDecimal ratePerLiter;
    private BigDecimal totalAmount;
}
