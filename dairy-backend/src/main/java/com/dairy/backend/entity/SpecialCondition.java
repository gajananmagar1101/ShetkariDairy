package com.dairy.backend.entity;

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
public class SpecialCondition {
    private String userId;

    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal quantity;
    @Builder.Default
    private boolean active = true;
}
