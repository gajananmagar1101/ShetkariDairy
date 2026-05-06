package com.dairy.backend.service;

import com.dairy.backend.dto.InvoiceDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final MilkEntryRepository milkEntryRepository;
    private final CustomerRepository customerRepository;

    public InvoiceDto generateMonthlyInvoice(String customerId, int year, int month) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        List<MilkEntry> entries = milkEntryRepository.findByCustomerIdAndDateBetween(customerId, startDate, endDate);
        
        BigDecimal totalAmount = entries.stream()
                .map(MilkEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Invoice invoice = Invoice.builder()
                .customerId(customerId)
                .invoiceYear(year)
                .invoiceMonth(month)
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .status(PaymentStatus.PENDING)
                .dueDate(endDate.plusDays(5))
                .build();

        invoice = invoiceRepository.save(invoice);
        return mapToDto(invoice, customer.getName());
    }

    public List<InvoiceDto> getAllInvoices() {
        return invoiceRepository.findAll().stream()
                .map(inv -> {
                    String name = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    return mapToDto(inv, name);
                })
                .collect(Collectors.toList());
    }

    private InvoiceDto mapToDto(Invoice invoice, String customerName) {
        return InvoiceDto.builder()
                .id(invoice.getId())
                .customerId(invoice.getCustomerId())
                .customerName(customerName)
                .invoiceMonth(invoice.getInvoiceMonth())
                .invoiceYear(invoice.getInvoiceYear())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .status(invoice.getStatus())
                .dueDate(invoice.getDueDate())
                .build();
    }

    public void deleteInvoice(String id) {
        invoiceRepository.deleteById(id);
    }
}
