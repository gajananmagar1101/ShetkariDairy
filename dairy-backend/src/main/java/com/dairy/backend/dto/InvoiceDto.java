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
public class InvoiceDto {
    private String id;
    private String customerId;
    private String customerName;
    private Integer invoiceMonth;
    private Integer invoiceYear;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private PaymentStatus status;
    private LocalDate dueDate;
}
