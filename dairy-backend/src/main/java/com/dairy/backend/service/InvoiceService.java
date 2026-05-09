package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.InvoiceDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.entity.Payment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final MilkEntryService milkEntryService;
    private final CustomerRepository customerRepository;
    private final PaymentRepository paymentRepository;

    public InvoiceDto generateInvoice(String customerId, LocalDate startDate, LocalDate endDate) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        List<MilkEntry> entries = milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), customerId, startDate, endDate);
        List<LocalDate> skippedDates = resolveSkippedDates(customer, entries, startDate, endDate);
        BigDecimal totalAmount = resolveTotalAmount(entries);

        Invoice invoice = Invoice.builder()
                .userId(SecurityUtils.getCurrentUserId())
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
        return invoiceRepository.findByUserId(SecurityUtils.getCurrentUserId(), Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(inv -> {
                    String name = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    LocalDate startDate = inv.getPeriodStartDate() != null
                            ? inv.getPeriodStartDate()
                            : LocalDate.of(inv.getInvoiceYear(), inv.getInvoiceMonth(), 1);
                    LocalDate endDate = inv.getPeriodEndDate() != null
                            ? inv.getPeriodEndDate()
                            : startDate.withDayOfMonth(startDate.lengthOfMonth());
                    List<MilkEntry> entries = milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), inv.getCustomerId(), startDate, endDate);
                    List<LocalDate> skippedDates = customerRepository.findById(inv.getCustomerId())
                            .map(customer -> resolveSkippedDates(customer, entries, startDate, endDate))
                            .orElseGet(ArrayList::new);
                    BigDecimal recalculatedTotalAmount = resolveTotalAmount(entries);
                    if (inv.getTotalAmount() == null || inv.getTotalAmount().compareTo(recalculatedTotalAmount) != 0) {
                        inv.setTotalAmount(recalculatedTotalAmount);
                        if (inv.getStatus() == PaymentStatus.PAID) {
                            inv.setPaidAmount(recalculatedTotalAmount);
                        }
                        invoiceRepository.save(inv);
                    }
                    return mapToDto(inv, name, skippedDates, recalculatedTotalAmount);
                })
                .collect(Collectors.toList());
    }

    private BigDecimal resolveTotalAmount(List<MilkEntry> entries) {
        return entries.stream()
                .map(MilkEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<LocalDate> resolveSkippedDates(Customer customer, List<MilkEntry> entries, LocalDate startDate, LocalDate endDate) {
        Set<LocalDate> deliveredDates = entries.stream()
                .map(MilkEntry::getDate)
                .collect(Collectors.toCollection(HashSet::new));

        List<LocalDate> customerSkippedDates = customer.getSkippedDates() != null
                ? customer.getSkippedDates()
                : new ArrayList<>();

        return customerSkippedDates.stream()
                .filter(date -> !date.isBefore(startDate) && !date.isAfter(endDate))
                .filter(date -> !deliveredDates.contains(date))
                .sorted()
                .collect(Collectors.toList());
    }

    private InvoiceDto mapToDto(Invoice invoice, String customerName, List<LocalDate> skippedDates) {
        return mapToDto(invoice, customerName, skippedDates, invoice.getTotalAmount());
    }

    private InvoiceDto mapToDto(Invoice invoice, String customerName, List<LocalDate> skippedDates, BigDecimal totalAmount) {
        return InvoiceDto.builder()
                .id(invoice.getId())
                .customerId(invoice.getCustomerId())
                .customerName(customerName)
                .periodStartDate(invoice.getPeriodStartDate())
                .periodEndDate(invoice.getPeriodEndDate())
                .invoiceMonth(invoice.getInvoiceMonth())
                .invoiceYear(invoice.getInvoiceYear())
                .totalAmount(totalAmount)
                .paidAmount(invoice.getPaidAmount())
                .status(invoice.getStatus())
                .skippedDates(skippedDates)
                .build();
    }

    public void deleteInvoice(String id) {
        invoiceRepository.deleteById(id);
    }

    public InvoiceDto markAsPaid(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (invoice.getStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("Invoice is already paid");
        }

        LocalDate startDate = invoice.getPeriodStartDate() != null
                ? invoice.getPeriodStartDate()
                : LocalDate.of(invoice.getInvoiceYear(), invoice.getInvoiceMonth(), 1);
        LocalDate endDate = invoice.getPeriodEndDate() != null
                ? invoice.getPeriodEndDate()
                : startDate.withDayOfMonth(startDate.lengthOfMonth());
        List<MilkEntry> entries = milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), invoice.getCustomerId(), startDate, endDate);
        BigDecimal totalAmount = resolveTotalAmount(entries);

        invoice.setTotalAmount(totalAmount);
        invoice.setStatus(PaymentStatus.PAID);
        invoice.setPaidAmount(totalAmount);
        invoice = invoiceRepository.save(invoice);

        // Record the payment
        Payment payment = Payment.builder()
                .userId(SecurityUtils.getCurrentUserId())
                .customerId(invoice.getCustomerId())
                .amount(totalAmount)
                .paymentDate(LocalDate.now())
                .paymentMethod("ONLINE")
                .status(PaymentStatus.PAID)
                .build();
        paymentRepository.save(payment);

        List<LocalDate> skippedDates = customerRepository.findById(invoice.getCustomerId())
                .map(customer -> resolveSkippedDates(customer, entries, startDate, endDate))
                .orElseGet(ArrayList::new);
        return mapToDto(invoice, "Updated", skippedDates, totalAmount);
    }
}
