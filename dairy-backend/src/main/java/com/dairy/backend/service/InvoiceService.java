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
import java.util.LinkedHashMap;
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
    private final com.dairy.backend.repository.UserRepository userRepository;

    private Set<String> resolveOwnedUserIds(String userId) {
        Set<String> ownedUserIds = new HashSet<>();
        userRepository.findById(userId)
                .or(() -> userRepository.findByEmail(userId))
                .or(() -> userRepository.findByPhone(userId))
                .ifPresentOrElse(
                        user -> {
                            if (user.getId() != null && !user.getId().isBlank()) {
                                ownedUserIds.add(user.getId());
                            }
                            if (user.getPhone() != null && !user.getPhone().isBlank()) {
                                ownedUserIds.add(user.getPhone());
                            }
                            if (user.getEmail() != null && !user.getEmail().isBlank()) {
                                ownedUserIds.add(user.getEmail());
                            }
                        },
                        () -> {
                            if (userId != null && !userId.isBlank()) {
                                ownedUserIds.add(userId);
                            }
                        }
        );
        return ownedUserIds;
    }

    private Set<String> resolveOwnedCustomerIds(Set<String> ownedUserIds) {
        Set<String> ownedCustomerIds = new HashSet<>();
        ownedUserIds.forEach(ownedUserId ->
                customerRepository.findByUserId(ownedUserId).forEach(customer -> {
                    if (customer.getId() != null && !customer.getId().isBlank()) {
                        ownedCustomerIds.add(customer.getId());
                    }
                })
        );
        return ownedCustomerIds;
    }

    private LocalDate resolveInvoiceStartDate(Invoice invoice) {
        return invoice.getPeriodStartDate() != null
                ? invoice.getPeriodStartDate()
                : LocalDate.of(invoice.getInvoiceYear(), invoice.getInvoiceMonth(), 1);
    }

    private LocalDate resolveInvoiceEndDate(Invoice invoice) {
        LocalDate startDate = resolveInvoiceStartDate(invoice);
        return invoice.getPeriodEndDate() != null
                ? invoice.getPeriodEndDate()
                : startDate.withDayOfMonth(startDate.lengthOfMonth());
    }

    private String invoicePeriodKey(Invoice invoice) {
        return invoice.getCustomerId() + "|" + resolveInvoiceStartDate(invoice) + "|" + resolveInvoiceEndDate(invoice);
    }

    private Invoice pickPreferredInvoice(Invoice existing, Invoice candidate) {
        if (existing == null) {
            return candidate;
        }
        if (candidate == null) {
            return existing;
        }
        BigDecimal existingAmount = existing.getTotalAmount() != null ? existing.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal candidateAmount = candidate.getTotalAmount() != null ? candidate.getTotalAmount() : BigDecimal.ZERO;
        int amountComparison = candidateAmount.compareTo(existingAmount);
        if (amountComparison != 0) {
            return amountComparison > 0 ? candidate : existing;
        }

        if (existing.getStatus() != candidate.getStatus()) {
            return existing.getStatus() == PaymentStatus.PAID ? existing : candidate;
        }

        LocalDateTime existingCreatedAt = existing.getCreatedAt();
        LocalDateTime candidateCreatedAt = candidate.getCreatedAt();
        if (existingCreatedAt != null && candidateCreatedAt != null && !existingCreatedAt.equals(candidateCreatedAt)) {
            return existingCreatedAt.isAfter(candidateCreatedAt) ? existing : candidate;
        }
        if (existingCreatedAt != null) {
            return existing;
        }
        if (candidateCreatedAt != null) {
            return candidate;
        }
        return existing.getId() != null && candidate.getId() != null && existing.getId().compareTo(candidate.getId()) >= 0
                ? existing
                : candidate;
    }

    private Invoice findExistingInvoiceForPeriod(Set<String> ownedUserIds, String customerId, LocalDate startDate, LocalDate endDate) {
        return ownedUserIds.stream()
                .flatMap(ownedUserId -> invoiceRepository.findByUserIdAndCustomerId(ownedUserId, customerId).stream())
                .filter(invoice -> resolveInvoiceStartDate(invoice).equals(startDate) && resolveInvoiceEndDate(invoice).equals(endDate))
                .reduce(this::pickPreferredInvoice)
                .orElse(null);
    }

    private List<Invoice> dedupeInvoicesByPeriod(List<Invoice> invoices) {
        Map<String, Invoice> deduped = new LinkedHashMap<>();
        for (Invoice invoice : invoices) {
            deduped.merge(invoicePeriodKey(invoice), invoice, this::pickPreferredInvoice);
        }
        return new ArrayList<>(deduped.values());
    }

    public InvoiceDto generateInvoice(String customerId, LocalDate startDate, LocalDate endDate) {
        return generateInvoiceForUser(SecurityUtils.getCurrentUserId(), customerId, startDate, endDate);
    }

    public InvoiceDto generateInvoiceForUser(String userId, String customerId, LocalDate startDate, LocalDate endDate) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Set<String> ownedUserIds = resolveOwnedUserIds(userId);
        List<MilkEntry> entries = findBillableEntries(ownedUserIds, customerId, startDate, endDate, null, null, null);
        List<LocalDate> skippedDates = resolveSkippedDates(customer, entries, startDate, endDate);
        BigDecimal totalAmount = resolveTotalAmount(entries);

        Invoice existingInvoice = findExistingInvoiceForPeriod(ownedUserIds, customerId, startDate, endDate);
        if (existingInvoice != null) {
            if (existingInvoice.getStatus() != PaymentStatus.PAID
                    && (existingInvoice.getTotalAmount() == null
                    || existingInvoice.getTotalAmount().compareTo(totalAmount) != 0)) {
                existingInvoice.setTotalAmount(totalAmount);
                existingInvoice.setPaidAmount(BigDecimal.ZERO);
                existingInvoice = invoiceRepository.save(existingInvoice);
            }
            return mapToDto(existingInvoice, customer.getName(), skippedDates);
        }

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
        Set<String> ownedUserIds = resolveOwnedUserIds(SecurityUtils.getCurrentUserId());
        return dedupeInvoicesByPeriod(
                ownedUserIds.stream()
                        .flatMap(ownedUserId -> invoiceRepository.findByUserId(ownedUserId, Sort.by(Sort.Direction.DESC, "createdAt")).stream())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Invoice::getId,
                                invoice -> invoice,
                                (existing, ignored) -> existing,
                                java.util.LinkedHashMap::new
                        ),
                        map -> new ArrayList<>(map.values())
                ))
        ).stream()
                .map(inv -> {
                    String name = customerRepository.findById(inv.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    LocalDate startDate = resolveInvoiceStartDate(inv);
                    LocalDate endDate = resolveInvoiceEndDate(inv);
                    List<MilkEntry> entries = inv.getStatus() == PaymentStatus.PAID
                            ? findBillableEntries(ownedUserIds, inv.getCustomerId(), startDate, endDate, inv.getId(), inv.getCreatedAt(), inv.getId())
                            : findBillableEntries(ownedUserIds, inv.getCustomerId(), startDate, endDate, inv.getId(), null, null);
                    List<LocalDate> skippedDates = customerRepository.findById(inv.getCustomerId())
                            .map(customer -> resolveSkippedDates(
                                    customer,
                                    milkEntryService.findEntriesByCustomerAndDateRange(resolveCurrentUserId(ownedUserIds), inv.getCustomerId(), startDate, endDate),
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

    public List<InvoiceDto> getInvoicesByCustomer(String customerId) {
        Set<String> ownedUserIds = resolveOwnedUserIds(SecurityUtils.getCurrentUserId());
        List<Invoice> invoices = ownedUserIds.stream()
                .flatMap(ownedUserId -> invoiceRepository.findByUserIdAndCustomerId(ownedUserId, customerId).stream())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Invoice::getId,
                                invoice -> invoice,
                                (existing, ignored) -> existing,
                                java.util.LinkedHashMap::new
                        ),
                        map -> new ArrayList<>(map.values())
                ));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        return dedupeInvoicesByPeriod(invoices).stream()
                .map(inv -> {
                    LocalDate startDate = resolveInvoiceStartDate(inv);
                    LocalDate endDate = resolveInvoiceEndDate(inv);
                    List<MilkEntry> entries = inv.getStatus() == PaymentStatus.PAID
                            ? findBillableEntries(ownedUserIds, inv.getCustomerId(), startDate, endDate, inv.getId(), inv.getCreatedAt(), inv.getId())
                            : findBillableEntries(ownedUserIds, inv.getCustomerId(), startDate, endDate, inv.getId(), null, null);
                    List<LocalDate> skippedDates = resolveSkippedDates(
                            customer,
                            milkEntryService.findEntriesByCustomerAndDateRange(resolveCurrentUserId(ownedUserIds), inv.getCustomerId(), startDate, endDate),
                            startDate,
                            endDate
                    );
                    BigDecimal effectiveTotalAmount = resolveTotalAmount(entries);
                    if (inv.getTotalAmount() == null || inv.getTotalAmount().compareTo(effectiveTotalAmount) != 0) {
                        inv.setTotalAmount(effectiveTotalAmount);
                        if (inv.getStatus() == PaymentStatus.PAID) {
                            inv.setPaidAmount(effectiveTotalAmount);
                        }
                        invoiceRepository.save(inv);
                    }
                    return mapToDto(inv, customer.getName(), skippedDates, effectiveTotalAmount);
                })
                .sorted(Comparator.comparing((InvoiceDto inv) -> inv.getPeriodStartDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private String resolveCurrentUserId(Set<String> ownedUserIds) {
        return ownedUserIds.stream().findFirst().orElse(SecurityUtils.getCurrentUserId());
    }

    private BigDecimal resolveTotalAmount(List<MilkEntry> entries) {
        return entries.stream()
                .map(MilkEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Set<LocalDate> findPaidDates(
            Set<String> ownedUserIds,
            String customerId,
            String ignoredInvoiceId,
            LocalDateTime cutoffCreatedAtExclusive,
            String cutoffIdExclusive
    ) {
        Set<LocalDate> paidDates = new HashSet<>();
        List<Invoice> invoices = ownedUserIds.stream()
                .flatMap(ownedUserId -> invoiceRepository.findByUserIdAndCustomerId(ownedUserId, customerId).stream())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Invoice::getId,
                                invoice -> invoice,
                                (existing, ignored) -> existing,
                                java.util.LinkedHashMap::new
                        ),
                        map -> new ArrayList<>(map.values())
                ))
                .stream()
                .sorted(Comparator
                        .comparing(Invoice::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Invoice::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

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
            Set<String> ownedUserIds,
            String customerId,
            LocalDate startDate,
            LocalDate endDate,
            String ignoredInvoiceId,
            LocalDateTime cutoffCreatedAtExclusive,
            String cutoffIdExclusive
    ) {
        return excludePaidEntries(
                milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), customerId, startDate, endDate),
                findPaidDates(ownedUserIds, customerId, ignoredInvoiceId, cutoffCreatedAtExclusive, cutoffIdExclusive)
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
        return markAsPaid(id, null);
    }

    public InvoiceDto markAsPaid(String id, BigDecimal paymentAmount) {
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
        Set<String> ownedUserIds = resolveOwnedUserIds(SecurityUtils.getCurrentUserId());
        String userId = SecurityUtils.getCurrentUserId();
        List<MilkEntry> rawEntries = milkEntryService.findEntriesByCustomerAndDateRange(userId, invoice.getCustomerId(), startDate, endDate);
        List<MilkEntry> entries = findBillableEntries(ownedUserIds, invoice.getCustomerId(), startDate, endDate, invoice.getId(), null, null);
        BigDecimal totalAmount = resolveTotalAmount(entries);
        LocalDate effectiveStartDate = entries.stream()
                .map(MilkEntry::getDate)
                .filter(date -> date != null)
                .min(LocalDate::compareTo)
                .orElse(startDate);
        LocalDate effectiveEndDate = entries.stream()
                .map(MilkEntry::getDate)
                .filter(date -> date != null)
                .max(LocalDate::compareTo)
                .orElse(endDate);
        BigDecimal alreadyPaid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal remainingDue = totalAmount.subtract(alreadyPaid);
        BigDecimal requestedPayment = paymentAmount != null ? paymentAmount : remainingDue;
        if (requestedPayment.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }
        if (requestedPayment.compareTo(remainingDue) > 0) {
            throw new RuntimeException("Payment amount cannot exceed remaining due");
        }

        invoice.setTotalAmount(totalAmount);
        invoice.setPaidAmount(alreadyPaid.add(requestedPayment));
        invoice.setStatus(invoice.getPaidAmount().compareTo(totalAmount) >= 0 ? PaymentStatus.PAID : PaymentStatus.PENDING);
        invoice = invoiceRepository.save(invoice);

        if (requestedPayment.compareTo(BigDecimal.ZERO) > 0) {
            final BigDecimal paymentToApply = requestedPayment;
            Payment payment = Payment.builder()
                    .userId(userId)
                    .customerId(invoice.getCustomerId())
                    .amount(paymentToApply)
                    .paymentDate(effectiveEndDate)
                    .paidFromDate(effectiveStartDate)
                    .paidToDate(effectiveEndDate)
                    .paymentMethod("ONLINE")
                    .status(PaymentStatus.PAID)
                    .build();
            paymentRepository.save(payment);

            customerRepository.findById(invoice.getCustomerId()).ifPresent(customer -> {
                BigDecimal currentBalance = customer.getBalance() != null ? customer.getBalance() : BigDecimal.ZERO;
                customer.setBalance(currentBalance.subtract(paymentToApply));
                customerRepository.save(customer);
            });
        }

        List<LocalDate> skippedDates = customerRepository.findById(invoice.getCustomerId())
                .map(customer -> resolveSkippedDates(customer, rawEntries, startDate, endDate))
                .orElseGet(ArrayList::new);
        return mapToDto(invoice, "Updated", skippedDates, totalAmount);
    }
}
