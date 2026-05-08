package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.InvoiceDto;
import com.dairy.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<InvoiceDto>> generateInvoice(
            @RequestParam String customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Invoice generated", invoiceService.generateInvoice(customerId, startDate, endDate)));
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

    @PutMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<InvoiceDto>> markAsPaid(@PathVariable String id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Invoice marked as paid", invoiceService.markAsPaid(id)));
    }
}
