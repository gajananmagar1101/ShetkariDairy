package com.dairy.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "customers")
public class Customer {

    @Id
    private String id;

    private String name;

    private String phone;

    private String address;

    private LocalDate joinedDate;

    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    private String milkType; // COW or BUFFALO
    private BigDecimal ratePerLiter;
    private BigDecimal dailyQuantity;

    @Builder.Default
    private boolean autoEntryEnabled = false;

    @Builder.Default
    private BigDecimal defaultMorningQuantity = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal defaultEveningQuantity = BigDecimal.ZERO;
    
    @Builder.Default
    private boolean isActive = true;

    @Indexed
    private String userId; // Optional link to User collection

    @Builder.Default
    private List<LocalDate> skippedDates = new ArrayList<>();

    @Builder.Default
    private List<DeliveryOverride> deliveryOverrides = new ArrayList<>();

    private SpecialCondition specialCondition;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
