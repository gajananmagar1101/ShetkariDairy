package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.InvoiceDto;
import com.dairy.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<InvoiceDto>> generateInvoice(
            @RequestParam String customerId,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Invoice generated", invoiceService.generateMonthlyInvoice(customerId, year, month)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<InvoiceDto>>> getAllInvoices() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Invoices fetched", invoiceService.getAllInvoices()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInvoice(@PathVariable String id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Invoice deleted", null));
    }
}
