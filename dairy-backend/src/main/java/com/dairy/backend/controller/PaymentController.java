package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.PaymentDto;
import com.dairy.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentDto>> addPayment(@RequestBody PaymentDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Payment recorded successfully", paymentService.processPayment(dto)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentDto>>> getAllPayments() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Payments fetched", paymentService.getAllPayments()));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<PaymentDto>>> getPaymentsByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Customer payments fetched", paymentService.getPaymentsByCustomer(customerId)));
    }
}
