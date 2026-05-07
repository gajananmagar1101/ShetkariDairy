package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerDto>> createCustomer(@RequestBody CustomerDto customerDto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Customer created", customerService.createCustomer(customerDto)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerDto>>> getAllCustomers() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Customers fetched", customerService.getAllCustomers()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable String id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Customer deleted", null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDto>> updateCustomer(@PathVariable String id, @RequestBody CustomerDto customerDto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Customer updated", customerService.updateCustomer(id, customerDto)));
    }

    @PostMapping("/{id}/no-delivery")
    public ResponseEntity<ApiResponse<CustomerDto>> markNoDelivery(
            @PathVariable String id, 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate, 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(new ApiResponse<>(true, "No delivery marked", customerService.markNoDelivery(id, startDate, endDate)));
    }

    @PostMapping("/{id}/delivery-override")
    public ResponseEntity<ApiResponse<CustomerDto>> setDeliveryOverride(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam BigDecimal quantity) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Delivery override saved", customerService.setDeliveryOverride(id, startDate, endDate, quantity)));
    }

    @DeleteMapping("/{id}/no-delivery")
    public ResponseEntity<ApiResponse<CustomerDto>> removeNoDelivery(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(new ApiResponse<>(true, "No delivery removed", customerService.removeNoDelivery(id, date)));
    }

    @DeleteMapping("/{id}/delivery-override")
    public ResponseEntity<ApiResponse<CustomerDto>> removeDeliveryOverride(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Delivery override removed", customerService.removeDeliveryOverride(id, date)));
    }
}
