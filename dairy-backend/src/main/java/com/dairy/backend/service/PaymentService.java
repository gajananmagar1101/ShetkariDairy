package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.PaymentDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.entity.PaymentStatus;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public PaymentDto processPayment(PaymentDto dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        Payment payment = Payment.builder()
                .customerId(customer.getId())
                .amount(dto.getAmount())
                .paymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDate.now())
                .paymentMethod(dto.getPaymentMethod())
                .status(PaymentStatus.PAID)
                .build();

        payment = paymentRepository.save(payment);

        // When dairy pays customer, balance decreases
        customer.setBalance(customer.getBalance().subtract(dto.getAmount()));
        customerRepository.save(customer);

        return mapToDto(payment, customer.getName());
    }

    public List<PaymentDto> getAllPayments() {
        return paymentRepository.findByUserId(SecurityUtils.getCurrentUserId()).stream()
                .map(p -> {
                    String name = customerRepository.findById(p.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    return mapToDto(p, name);
                })
                .collect(Collectors.toList());
    }

    private PaymentDto mapToDto(Payment payment, String customerName) {
        return PaymentDto.builder()
                .id(payment.getId())
                .customerId(payment.getCustomerId())
                .customerName(customerName)
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .build();
    }
}
