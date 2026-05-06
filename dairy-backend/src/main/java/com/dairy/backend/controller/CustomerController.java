package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
