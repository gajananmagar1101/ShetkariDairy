package com.dairy.backend.service;

import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.entity.User;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyCollection;

@ExtendWith(MockitoExtension.class)
class CustomerServiceBalanceAliasTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private MilkEntryRepository milkEntryRepository;

    @Mock
    private MilkEntryService milkEntryService;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomerService customerService;

    @Test
    void getAllCustomers_usesLinkedAliasesForLiveBalance() {
        String alias = "9876543210";
        String canonicalUserId = "user-1";
        String customerId = "customer-1";

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(alias, "token", List.of())
        );

        try {
            Customer customer = Customer.builder()
                    .id(customerId)
                    .userId(alias)
                    .name("Test Customer")
                    .balance(BigDecimal.ZERO)
                    .ratePerLiter(new BigDecimal("70"))
                    .autoEntryEnabled(true)
                    .isActive(true)
                    .build();

            User user = User.builder()
                    .id(canonicalUserId)
                    .phone(alias)
                    .email("alias@example.com")
                    .build();

            when(userRepository.findById(alias)).thenReturn(Optional.empty());
            when(userRepository.findByEmail(alias)).thenReturn(Optional.empty());
            when(userRepository.findByPhone(alias)).thenReturn(Optional.of(user));
            when(customerRepository.findByUserId(alias)).thenReturn(List.of(customer));
            when(milkEntryRepository.findByUserIdIn(anyCollection())).thenReturn(List.of(
                    MilkEntry.builder()
                            .userId(canonicalUserId)
                            .customerId(customerId)
                            .date(LocalDate.of(2026, 5, 31))
                            .totalAmount(new BigDecimal("70"))
                            .build()
            ));
            when(invoiceRepository.findByUserIdIn(anyCollection(), eq(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "createdAt")))).thenReturn(List.of());
            when(paymentRepository.findByUserIdIn(anyCollection(), eq(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "createdAt")))).thenReturn(List.of());
            List<CustomerDto> customers = customerService.getAllCustomers();

            assertEquals(1, customers.size());
            assertEquals(0, new BigDecimal("70").compareTo(customers.get(0).getBalance()));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void getAllCustomers_countsPartialInvoicePaymentsInBalance() {
        String alias = "9876543210";
        String canonicalUserId = "user-1";
        String customerId = "customer-1";

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(alias, "token", List.of())
        );

        try {
            Customer customer = Customer.builder()
                    .id(customerId)
                    .userId(alias)
                    .name("Test Customer")
                    .balance(BigDecimal.ZERO)
                    .ratePerLiter(new BigDecimal("70"))
                    .autoEntryEnabled(true)
                    .isActive(true)
                    .build();

            User user = User.builder()
                    .id(canonicalUserId)
                    .phone(alias)
                    .email("alias@example.com")
                    .build();

            when(userRepository.findById(alias)).thenReturn(Optional.empty());
            when(userRepository.findByEmail(alias)).thenReturn(Optional.empty());
            when(userRepository.findByPhone(alias)).thenReturn(Optional.of(user));
            when(customerRepository.findByUserId(alias)).thenReturn(List.of(customer));
            when(milkEntryRepository.findByUserIdIn(anyCollection())).thenReturn(List.of(
                    MilkEntry.builder()
                            .userId(canonicalUserId)
                            .customerId(customerId)
                            .date(LocalDate.of(2026, 6, 30))
                            .totalAmount(new BigDecimal("2100"))
                            .build()
            ));
            when(invoiceRepository.findByUserIdIn(anyCollection(), eq(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "createdAt")))).thenReturn(List.of(
                    Invoice.builder()
                            .id("invoice-1")
                            .userId(canonicalUserId)
                            .customerId(customerId)
                            .periodStartDate(LocalDate.of(2026, 6, 1))
                            .periodEndDate(LocalDate.of(2026, 6, 30))
                            .invoiceYear(2026)
                            .invoiceMonth(6)
                            .totalAmount(new BigDecimal("2100"))
                            .paidAmount(new BigDecimal("1050"))
                            .status(PaymentStatus.PENDING)
                            .build()
            ));
            when(paymentRepository.findByUserIdIn(anyCollection(), eq(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "createdAt")))).thenReturn(List.of());

            List<CustomerDto> customers = customerService.getAllCustomers();

            assertEquals(1, customers.size());
            assertEquals(0, new BigDecimal("1050").compareTo(customers.get(0).getBalance()));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
