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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

        String userId = SecurityUtils.getCurrentUserId();
        List<MilkEntry> entries = findBillableEntries(userId, customerId, startDate, endDate, null, null, null);
        List<LocalDate> skippedDates = resolveSkippedDates(customer, entries, startDate, endDate);
        BigDecimal totalAmount = resolveTotalAmount(entries);

        Invoice invoice = Invoice.builder()
                .userId(userId)
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
        String userId = SecurityUtils.getCurrentUserId();
        return invoiceRepository.findByUserId(userId, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(inv -> {
                    String name = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    LocalDate startDate = inv.getPeriodStartDate() != null
                            ? inv.getPeriodStartDate()
                            : LocalDate.of(inv.getInvoiceYear(), inv.getInvoiceMonth(), 1);
                    LocalDate endDate = inv.getPeriodEndDate() != null
                            ? inv.getPeriodEndDate()
                            : startDate.withDayOfMonth(startDate.lengthOfMonth());
                    List<MilkEntry> entries = inv.getStatus() == PaymentStatus.PAID
                            ? findBillableEntries(userId, inv.getCustomerId(), startDate, endDate, inv.getId(), inv.getCreatedAt(), inv.getId())
                            : findBillableEntries(userId, inv.getCustomerId(), startDate, endDate, inv.getId(), null, null);
                    List<LocalDate> skippedDates = customerRepository.findById(inv.getCustomerId())
                            .map(customer -> resolveSkippedDates(
                                    customer,
                                    milkEntryService.findEntriesByCustomerAndDateRange(userId, inv.getCustomerId(), startDate, endDate),
                                    startDate,
                                    endDate
                            ))
                            .orElseGet(ArrayList::new);
                    BigDecimal effectiveTotalAmount = resolveTotalAmount(entries);
                    if (inv.getTotalAmount() == null || inv.getTotalAmount().compareTo(effectiveTotalAmount) != 0) {
                        inv.setTotalAmount(effectiveTotalAmount);
                        if (inv.getStatus() == PaymentStatus.PAID) {
                            inv.setPaidAmount(effectiveTotalAmount);
                        }
                        invoiceRepository.save(inv);
                    }
                    return mapToDto(inv, name, skippedDates, effectiveTotalAmount);
                })
                .collect(Collectors.toList());
    }

    private BigDecimal resolveTotalAmount(List<MilkEntry> entries) {
        return entries.stream()
                .map(MilkEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Set<LocalDate> findPaidDates(
            String userId,
            String customerId,
            String ignoredInvoiceId,
            LocalDateTime cutoffCreatedAtExclusive,
            String cutoffIdExclusive
    ) {
        Set<LocalDate> paidDates = new HashSet<>();
        List<Payment> payments = paymentRepository.findByUserIdAndCustomerId(userId, customerId).stream()
                .sorted(Comparator
                        .comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
        List<Invoice> invoices = invoiceRepository.findByUserIdAndCustomerId(userId, customerId).stream()
                .sorted(Comparator
                        .comparing(Invoice::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Invoice::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        for (Payment payment : payments) {
            if (!shouldIncludeRecord(payment.getCreatedAt(), payment.getId(), cutoffCreatedAtExclusive, cutoffIdExclusive)) {
                continue;
            }
            if (payment.getPaidFromDate() != null && payment.getPaidToDate() != null) {
                for (LocalDate date = payment.getPaidFromDate(); !date.isAfter(payment.getPaidToDate()); date = date.plusDays(1)) {
                    paidDates.add(date);
                }
            }
        }

        for (Invoice invoice : invoices) {
            if (invoice.getStatus() != PaymentStatus.PAID) {
                continue;
            }
            if (ignoredInvoiceId != null && ignoredInvoiceId.equals(invoice.getId())) {
                continue;
            }
            if (!shouldIncludeRecord(invoice.getCreatedAt(), invoice.getId(), cutoffCreatedAtExclusive, cutoffIdExclusive)) {
                continue;
            }

            LocalDate startDate = invoice.getPeriodStartDate() != null
                    ? invoice.getPeriodStartDate()
                    : LocalDate.of(invoice.getInvoiceYear(), invoice.getInvoiceMonth(), 1);
            LocalDate endDate = invoice.getPeriodEndDate() != null
                    ? invoice.getPeriodEndDate()
                    : startDate.withDayOfMonth(startDate.lengthOfMonth());

            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                paidDates.add(date);
            }
        }

        return paidDates;
    }

    private boolean shouldIncludeRecord(
            LocalDateTime recordCreatedAt,
            String recordId,
            LocalDateTime cutoffCreatedAtExclusive,
            String cutoffIdExclusive
    ) {
        if (cutoffCreatedAtExclusive == null) {
            return true;
        }
        if (recordCreatedAt != null) {
            return recordCreatedAt.isBefore(cutoffCreatedAtExclusive);
        }
        return recordId != null && cutoffIdExclusive != null && recordId.compareTo(cutoffIdExclusive) < 0;
    }

    private List<MilkEntry> excludePaidEntries(List<MilkEntry> entries, Set<LocalDate> paidDates) {
        if (paidDates.isEmpty()) {
            return entries;
        }

        return entries.stream()
                .filter(entry -> entry.getDate() != null)
                .filter(entry -> !paidDates.contains(entry.getDate()))
                .collect(Collectors.toList());
    }

    private List<MilkEntry> findBillableEntries(
            String userId,
            String customerId,
            LocalDate startDate,
            LocalDate endDate,
            String ignoredInvoiceId,
            LocalDateTime cutoffCreatedAtExclusive,
            String cutoffIdExclusive
    ) {
        return excludePaidEntries(
                milkEntryService.findEntriesByCustomerAndDateRange(userId, customerId, startDate, endDate),
                findPaidDates(userId, customerId, ignoredInvoiceId, cutoffCreatedAtExclusive, cutoffIdExclusive)
        );
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
        String userId = SecurityUtils.getCurrentUserId();
        List<MilkEntry> rawEntries = milkEntryService.findEntriesByCustomerAndDateRange(userId, invoice.getCustomerId(), startDate, endDate);
        List<MilkEntry> entries = findBillableEntries(userId, invoice.getCustomerId(), startDate, endDate, invoice.getId(), null, null);
        BigDecimal totalAmount = resolveTotalAmount(entries);

        invoice.setTotalAmount(totalAmount);
        invoice.setStatus(PaymentStatus.PAID);
        invoice.setPaidAmount(totalAmount);
        invoice = invoiceRepository.save(invoice);

        if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = Payment.builder()
                    .userId(userId)
                    .customerId(invoice.getCustomerId())
                    .amount(totalAmount)
                    .paymentDate(LocalDate.now())
                    .paidFromDate(startDate)
                    .paidToDate(endDate)
                    .paymentMethod("ONLINE")
                    .status(PaymentStatus.PAID)
                    .build();
            paymentRepository.save(payment);
        }

        List<LocalDate> skippedDates = customerRepository.findById(invoice.getCustomerId())
                .map(customer -> resolveSkippedDates(customer, rawEntries, startDate, endDate))
                .orElseGet(ArrayList::new);
        return mapToDto(invoice, "Updated", skippedDates, totalAmount);
    }
}
