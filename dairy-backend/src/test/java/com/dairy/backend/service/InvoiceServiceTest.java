package com.dairy.backend.service;

import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private MilkEntryService milkEntryService;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    @Test
    void generateInvoice_reusesExistingInvoiceForSamePeriod() {
        String customerId = "customer-1";
        LocalDate startDate = LocalDate.of(2026, 5, 1);
        LocalDate endDate = LocalDate.of(2026, 5, 31);

        Customer customer = Customer.builder()
                .id(customerId)
                .userId("default-user-id")
                .name("Test Customer")
                .build();

        Invoice existingInvoice = Invoice.builder()
                .id("invoice-1")
                .userId("default-user-id")
                .customerId(customerId)
                .periodStartDate(startDate)
                .periodEndDate(endDate)
                .invoiceYear(2026)
                .invoiceMonth(5)
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .status(PaymentStatus.PENDING)
                .build();

        when(userRepository.findById("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("default-user-id")).thenReturn(Optional.empty());
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(customerRepository.findByUserId("default-user-id")).thenReturn(List.of(customer));
        when(invoiceRepository.findByUserIdAndCustomerId("default-user-id", customerId)).thenReturn(List.of(existingInvoice));
        when(paymentRepository.findAll()).thenReturn(List.of());
        when(milkEntryService.findEntriesByCustomerAndDateRange(any(), eq(customerId), eq(startDate), eq(endDate)))
                .thenReturn(List.of());

        var result = invoiceService.generateInvoice(customerId, startDate, endDate);

        assertEquals("invoice-1", result.getId());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getTotalAmount()));
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    void markAsPaid_usesActualBillableDatesAndUpdatesCustomerBalance() {
        String customerId = "customer-1";
        LocalDate requestStartDate = LocalDate.of(2026, 5, 1);
        LocalDate requestEndDate = LocalDate.of(2026, 6, 1);
        LocalDate billableStartDate = LocalDate.of(2026, 6, 1);
        LocalDate billableEndDate = LocalDate.of(2026, 6, 1);

        Customer customer = Customer.builder()
                .id(customerId)
                .userId("default-user-id")
                .name("Test Customer")
                .balance(new BigDecimal("70"))
                .build();

        Invoice invoice = Invoice.builder()
                .id("invoice-1")
                .userId("default-user-id")
                .customerId(customerId)
                .periodStartDate(requestStartDate)
                .periodEndDate(requestEndDate)
                .invoiceYear(2026)
                .invoiceMonth(5)
                .totalAmount(new BigDecimal("70"))
                .paidAmount(BigDecimal.ZERO)
                .status(PaymentStatus.PENDING)
                .build();

        MilkEntry billableEntry = MilkEntry.builder()
                .id("entry-1")
                .userId("default-user-id")
                .customerId(customerId)
                .date(billableStartDate)
                .totalAmount(new BigDecimal("70"))
                .build();

        when(invoiceRepository.findById("invoice-1")).thenReturn(Optional.of(invoice));
        when(userRepository.findById("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("default-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("default-user-id")).thenReturn(Optional.empty());
        when(customerRepository.findByUserId("default-user-id")).thenReturn(List.of(customer));
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(invoiceRepository.findByUserIdAndCustomerId("default-user-id", customerId)).thenReturn(List.of(invoice));
        when(milkEntryService.findEntriesByCustomerAndDateRange("default-user-id", customerId, requestStartDate, requestEndDate))
                .thenReturn(List.of(billableEntry));
        when(paymentRepository.findAll()).thenReturn(List.of());
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = invoiceService.markAsPaid("invoice-1");

        assertEquals(PaymentStatus.PAID, result.getStatus());
        assertEquals(0, new BigDecimal("70").compareTo(result.getTotalAmount()));

        ArgumentCaptor<com.dairy.backend.entity.Payment> paymentCaptor = ArgumentCaptor.forClass(com.dairy.backend.entity.Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertEquals(billableStartDate, paymentCaptor.getValue().getPaidFromDate());
        assertEquals(billableEndDate, paymentCaptor.getValue().getPaidToDate());

        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(customerCaptor.capture());
        assertEquals(0, new BigDecimal("0").compareTo(customerCaptor.getValue().getBalance()));
    }
}
