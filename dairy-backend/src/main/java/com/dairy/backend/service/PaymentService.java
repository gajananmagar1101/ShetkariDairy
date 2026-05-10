package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.PaymentDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
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

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    @Transactional
    public PaymentDto processPayment(PaymentDto dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        BigDecimal amount = dto.getAmount();
        if ((amount == null || amount.compareTo(BigDecimal.ZERO) <= 0)
                && dto.getPaidFromDate() != null
                && dto.getPaidToDate() != null) {
            amount = milkEntryRepository.findByUserIdAndCustomerIdAndDateBetween(
                            SecurityUtils.getCurrentUserId(),
                            customer.getId(),
                            dto.getPaidFromDate(),
                            dto.getPaidToDate()
                    ).stream()
                    .map(entry -> entry.getTotalAmount() != null ? entry.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        Payment payment = Payment.builder()
                .customerId(customer.getId())
                .amount(amount)
                .paymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDate.now())
                .paidFromDate(dto.getPaidFromDate())
                .paidToDate(dto.getPaidToDate())
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
        String userId = SecurityUtils.getCurrentUserId();
        List<Payment> payments = paymentRepository.findByUserId(
                        userId,
                        Sort.by(Sort.Direction.ASC, "paymentDate", "createdAt")
                );
        Map<String, Map<LocalDate, BigDecimal>> customerEntryAmountByDate = new HashMap<>();
        Map<String, Set<LocalDate>> customerCoveredDates = new HashMap<>();

        List<PaymentDto> dtos = payments.stream()
                .map(payment -> {
                    BigDecimal effectiveAmount = resolveEffectivePaymentAmount(
                            userId,
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

                    String name = customerRepository.findById(payment.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
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

    private BigDecimal resolveEffectivePaymentAmount(
            String userId,
            Payment payment,
            Map<String, Map<LocalDate, BigDecimal>> customerEntryAmountByDate,
            Map<String, Set<LocalDate>> customerCoveredDates
    ) {
        if (payment.getPaidFromDate() == null || payment.getPaidToDate() == null) {
            return safe(payment.getAmount());
        }

        Map<LocalDate, BigDecimal> entryAmountByDate = customerEntryAmountByDate.computeIfAbsent(
                payment.getCustomerId(),
                customerId -> milkEntryRepository.findByUserIdAndCustomerId(userId, customerId).stream()
                        .filter(entry -> entry.getDate() != null)
                        .collect(Collectors.toMap(
                                entry -> entry.getDate(),
                                entry -> safe(entry.getTotalAmount()),
                                BigDecimal::add
                        ))
        );
        Set<LocalDate> coveredDates = customerCoveredDates.computeIfAbsent(payment.getCustomerId(), key -> new HashSet<>());

        BigDecimal effectiveAmount = BigDecimal.ZERO;
        for (LocalDate date = payment.getPaidFromDate(); !date.isAfter(payment.getPaidToDate()); date = date.plusDays(1)) {
            if (coveredDates.add(date)) {
                effectiveAmount = effectiveAmount.add(entryAmountByDate.getOrDefault(date, BigDecimal.ZERO));
            }
        }

        return effectiveAmount;
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
