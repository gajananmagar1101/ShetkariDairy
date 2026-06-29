package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.PaymentDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final MilkEntryRepository milkEntryRepository;
    private final UserRepository userRepository;

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

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

    @Transactional
    public PaymentDto processPayment(PaymentDto dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        BigDecimal amount = dto.getAmount();
        List<MilkEntry> billableEntries = List.of();
        if ((amount == null || amount.compareTo(BigDecimal.ZERO) <= 0)
                && dto.getPaidFromDate() != null
                && dto.getPaidToDate() != null) {
            LocalDate queryStartDate = dto.getPaidFromDate().minusDays(1);
            LocalDate queryEndDate = dto.getPaidToDate().plusDays(1);
            billableEntries = resolveOwnedUserIds(SecurityUtils.getCurrentUserId()).stream()
                    .flatMap(ownedUserId -> milkEntryRepository.findByUserIdAndCustomerIdAndDateBetween(
                            ownedUserId,
                            customer.getId(),
                            queryStartDate,
                            queryEndDate
                    ).stream())
                    .filter(entry -> entry.getDate() != null)
                    .filter(entry -> !entry.getDate().isBefore(dto.getPaidFromDate()) && !entry.getDate().isAfter(dto.getPaidToDate()))
                    .toList();
            amount = billableEntries.stream()
                    .map(entry -> entry.getTotalAmount() != null ? entry.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        LocalDate effectivePaidFromDate = dto.getPaidFromDate();
        LocalDate effectivePaidToDate = dto.getPaidToDate();
        if (!billableEntries.isEmpty()) {
            effectivePaidFromDate = billableEntries.stream()
                    .map(MilkEntry::getDate)
                    .filter(date -> date != null)
                    .min(LocalDate::compareTo)
                    .orElse(effectivePaidFromDate);
            effectivePaidToDate = billableEntries.stream()
                    .map(MilkEntry::getDate)
                    .filter(date -> date != null)
                    .max(LocalDate::compareTo)
                    .orElse(effectivePaidToDate);
        }

        Payment payment = Payment.builder()
                .userId(SecurityUtils.getCurrentUserId())
                .customerId(customer.getId())
                .amount(amount)
                .paymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDate.now())
                .paidFromDate(effectivePaidFromDate)
                .paidToDate(effectivePaidToDate)
                .paymentMethod(dto.getPaymentMethod())
                .status(PaymentStatus.PAID)
                .build();

        payment = paymentRepository.save(payment);

        // When dairy pays customer, balance decreases
        customer.setBalance(customer.getBalance().subtract(amount));
        customerRepository.save(customer);

        return mapToDto(payment, customer.getName());
    }

    public List<PaymentDto> getAllPayments() {
        Set<String> ownedUserIds = resolveOwnedUserIds(SecurityUtils.getCurrentUserId());
        Set<String> ownedCustomerIds = resolveOwnedCustomerIds(ownedUserIds);
        List<Payment> payments = paymentRepository.findByUserIdIn(ownedUserIds, Sort.by(Sort.Direction.DESC, "paymentDate")).stream()
                .filter(payment -> payment.getCustomerId() != null && ownedCustomerIds.contains(payment.getCustomerId()))
                .sorted(Comparator
                        .comparing(Payment::getPaymentDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Payment::getId,
                                payment -> payment,
                                (existing, ignored) -> existing,
                                java.util.LinkedHashMap::new
                        ),
                        map -> new java.util.ArrayList<>(map.values())
                ));
        Map<String, Map<LocalDate, BigDecimal>> customerEntryAmountByDate = new HashMap<>();
        Map<String, Set<LocalDate>> customerCoveredDates = new HashMap<>();

        // Batch-load all customer names to avoid N+1 queries
        Set<String> customerIds = payments.stream()
                .map(Payment::getCustomerId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<String, String> customerNameMap = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Customer::getName, (a, b) -> a));

        List<PaymentDto> dtos = payments.stream()
                .map(payment -> {
                    BigDecimal effectiveAmount = resolveEffectivePaymentAmount(
                            ownedUserIds,
                            payment,
                            customerEntryAmountByDate,
                            customerCoveredDates
                    );
                    if (payment.getPaidFromDate() != null
                            && payment.getPaidToDate() != null
                            && effectiveAmount.compareTo(safe(payment.getAmount())) != 0) {
                        payment.setAmount(effectiveAmount);
                        paymentRepository.save(payment);
                    }

                    String name = customerNameMap.getOrDefault(payment.getCustomerId(), "Unknown");
                    PaymentDto dto = mapToDto(payment, name);
                    dto.setAmount(effectiveAmount);
                    return dto;
                })
                .sorted(Comparator
                        .comparing(PaymentDto::getPaymentDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PaymentDto::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        return dtos;
    }

    public List<PaymentDto> getPaymentsByCustomer(String customerId) {
        Set<String> ownedUserIds = resolveOwnedUserIds(SecurityUtils.getCurrentUserId());
        List<Payment> payments = ownedUserIds.stream()
                .flatMap(ownedUserId -> paymentRepository.findByUserIdAndCustomerId(ownedUserId, customerId).stream())
                .sorted(Comparator
                        .comparing(Payment::getPaymentDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Payment::getId,
                                payment -> payment,
                                (existing, ignored) -> existing,
                                java.util.LinkedHashMap::new
                        ),
                        map -> new java.util.ArrayList<>(map.values())
                ));

        // Batch-load customer name once instead of per-payment
        String customerName = customerRepository.findById(customerId)
                .map(Customer::getName).orElse("Unknown");

        return payments.stream()
                .map(payment -> mapToDto(payment, customerName))
                .sorted(Comparator
                        .comparing(PaymentDto::getPaymentDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PaymentDto::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private BigDecimal resolveEffectivePaymentAmount(
            Set<String> ownedUserIds,
            Payment payment,
            Map<String, Map<LocalDate, BigDecimal>> customerEntryAmountByDate,
            Map<String, Set<LocalDate>> customerCoveredDates
    ) {
        return safe(payment.getAmount());
    }

    private PaymentDto mapToDto(Payment payment, String customerName) {
        return PaymentDto.builder()
                .id(payment.getId())
                .customerId(payment.getCustomerId())
                .customerName(customerName)
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .paidFromDate(payment.getPaidFromDate())
                .paidToDate(payment.getPaidToDate())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .build();
    }
}
