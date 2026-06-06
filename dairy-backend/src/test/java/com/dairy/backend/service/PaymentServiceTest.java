package com.dairy.backend.service;

import com.dairy.backend.dto.PaymentDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private MilkEntryRepository milkEntryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    void processPayment_setsCurrentUserIdOnSavedPayment() {
        Customer customer = Customer.builder()
                .id("customer-1")
                .name("Test Customer")
                .balance(BigDecimal.ZERO)
                .build();

        when(customerRepository.findById("customer-1")).thenReturn(Optional.of(customer));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentDto result = paymentService.processPayment(PaymentDto.builder()
                .customerId("customer-1")
                .amount(new BigDecimal("150"))
                .paymentDate(LocalDate.of(2026, 6, 2))
                .paymentMethod("CASH")
                .build());

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertEquals("default-user-id", paymentCaptor.getValue().getUserId());
        assertEquals(0, new BigDecimal("150").compareTo(paymentCaptor.getValue().getAmount()));
        assertEquals(0, new BigDecimal("-150").compareTo(customer.getBalance()));
        assertEquals("Test Customer", result.getCustomerName());
        verify(milkEntryRepository, never()).findByUserIdAndCustomerIdAndDateBetween(any(), any(), any(), any());
    }

    @Test
    void processPayment_usesActualBillableDatesWhenAmountIsDerivedFromRange() {
        Customer customer = Customer.builder()
                .id("customer-1")
                .name("Test Customer")
                .balance(BigDecimal.ZERO)
                .build();

        MilkEntry entry = MilkEntry.builder()
                .id("entry-1")
                .userId("default-user-id")
                .customerId("customer-1")
                .date(LocalDate.of(2026, 6, 1))
                .totalAmount(new BigDecimal("70"))
                .build();

        when(customerRepository.findById("customer-1")).thenReturn(Optional.of(customer));
        when(userRepository.findById("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("default-user-id")).thenReturn(Optional.empty());
        when(milkEntryRepository.findByUserIdAndCustomerIdAndDateBetween("default-user-id", "customer-1", LocalDate.of(2026, 5, 31), LocalDate.of(2026, 6, 2)))
                .thenReturn(List.of(entry));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.processPayment(PaymentDto.builder()
                .customerId("customer-1")
                .amount(BigDecimal.ZERO)
                .paidFromDate(LocalDate.of(2026, 6, 1))
                .paidToDate(LocalDate.of(2026, 6, 1))
                .paymentDate(LocalDate.of(2026, 6, 2))
                .paymentMethod("CASH")
                .build());

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertEquals(LocalDate.of(2026, 6, 1), paymentCaptor.getValue().getPaidFromDate());
        assertEquals(LocalDate.of(2026, 6, 1), paymentCaptor.getValue().getPaidToDate());
        assertEquals(0, new BigDecimal("70").compareTo(paymentCaptor.getValue().getAmount()));
    }
}
