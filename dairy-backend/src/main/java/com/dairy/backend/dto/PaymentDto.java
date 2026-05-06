package com.dairy.backend.dto;

import com.dairy.backend.entity.PaymentStatus;
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
public class PaymentDto {
    private String id;
    private String customerId;
    private String customerName;
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String paymentMethod;
    private PaymentStatus status;
}
