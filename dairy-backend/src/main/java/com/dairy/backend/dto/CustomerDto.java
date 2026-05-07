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
public class CustomerDto {
    private String id;
    private String name;
    private String phone;
    private String address;
    private BigDecimal balance;
    private String milkType;
    private BigDecimal ratePerLiter;
    private BigDecimal dailyQuantity;
    private Boolean autoEntryEnabled;
    private BigDecimal defaultMorningQuantity;
    private BigDecimal defaultEveningQuantity;
    private Boolean active;
}
