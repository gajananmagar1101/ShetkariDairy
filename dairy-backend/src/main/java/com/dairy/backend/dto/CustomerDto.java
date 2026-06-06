package com.dairy.backend.dto;

import com.dairy.backend.entity.DeliveryOverride;
import com.dairy.backend.entity.SpecialCondition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    private List<LocalDate> skippedDates;
    private List<DeliveryOverride> deliveryOverrides;
    private SpecialCondition specialCondition;
    private Boolean active;
    private LocalDateTime stoppedAt;
    private LocalDate recentEntryDate;
    private BigDecimal recentEntryQuantity;
    private BigDecimal recentEntryAmount;
    private Boolean recentEntrySkipped;
}
