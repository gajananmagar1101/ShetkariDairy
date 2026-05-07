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

import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final MilkEntryRepository milkEntryRepository;
    private final CustomerRepository customerRepository;

    public InvoiceDto generateInvoice(String customerId, LocalDate startDate, LocalDate endDate) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        List<MilkEntry> entries = milkEntryRepository.findByCustomerIdAndDateBetween(customerId, startDate, endDate);
        List<LocalDate> skippedDates = customer.getSkippedDates() != null
                ? customer.getSkippedDates().stream()
                .filter(date -> !date.isBefore(startDate) && !date.isAfter(endDate))
                .sorted()
                .collect(Collectors.toList())
                : new ArrayList<>();
        
        BigDecimal totalAmount = entries.stream()
                .map(MilkEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Invoice invoice = Invoice.builder()
                .customerId(customerId)
                .periodStartDate(startDate)
                .periodEndDate(endDate)
                .invoiceYear(startDate.getYear())
                .invoiceMonth(startDate.getMonthValue())
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .status(PaymentStatus.PENDING)
                .build();

        invoice = invoiceRepository.save(invoice);
        return mapToDto(invoice, customer.getName(), skippedDates);
    }

    public List<InvoiceDto> getAllInvoices() {
        return invoiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(inv -> {
                    String name = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    LocalDate startDate = inv.getPeriodStartDate() != null
                            ? inv.getPeriodStartDate()
                            : LocalDate.of(inv.getInvoiceYear(), inv.getInvoiceMonth(), 1);
                    LocalDate endDate = inv.getPeriodEndDate() != null
                            ? inv.getPeriodEndDate()
                            : startDate.withDayOfMonth(startDate.lengthOfMonth());
                    List<LocalDate> skippedDates = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getSkippedDates)
                            .orElseGet(ArrayList::new)
                            .stream()
                            .filter(date -> !date.isBefore(startDate) && !date.isAfter(endDate))
                            .sorted()
                            .collect(Collectors.toList());
                    return mapToDto(inv, name, skippedDates);
                })
                .collect(Collectors.toList());
    }

    private InvoiceDto mapToDto(Invoice invoice, String customerName, List<LocalDate> skippedDates) {
        return InvoiceDto.builder()
                .id(invoice.getId())
                .customerId(invoice.getCustomerId())
                .customerName(customerName)
                .periodStartDate(invoice.getPeriodStartDate())
                .periodEndDate(invoice.getPeriodEndDate())
                .invoiceMonth(invoice.getInvoiceMonth())
                .invoiceYear(invoice.getInvoiceYear())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .status(invoice.getStatus())
                .skippedDates(skippedDates)
                .build();
    }

    public void deleteInvoice(String id) {
        invoiceRepository.deleteById(id);
    }
}
