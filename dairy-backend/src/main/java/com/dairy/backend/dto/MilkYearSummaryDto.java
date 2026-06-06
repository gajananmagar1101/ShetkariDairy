package com.dairy.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MilkYearSummaryDto {
    private int year;
    private int month;
    private BigDecimal totalAmount;
    private BigDecimal totalQuantity;
    private int deliveredDays;
}
