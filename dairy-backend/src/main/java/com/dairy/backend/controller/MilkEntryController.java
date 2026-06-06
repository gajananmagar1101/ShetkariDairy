package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.MilkEntryDto;
import com.dairy.backend.dto.MilkYearSummaryDto;
import com.dairy.backend.service.MilkEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/milk-entries")
@RequiredArgsConstructor
public class MilkEntryController {

    private final MilkEntryService milkEntryService;

    @PostMapping
    public ResponseEntity<ApiResponse<MilkEntryDto>> addEntry(@RequestBody MilkEntryDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entry added", milkEntryService.addMilkEntry(dto)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MilkEntryDto>>> getEntries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entries fetched", milkEntryService.getEntriesByDate(queryDate)));
    }

    @GetMapping("/customer-month")
    public ResponseEntity<ApiResponse<List<MilkEntryDto>>> getEntriesByCustomerAndMonth(
            @RequestParam String customerId,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entries fetched", milkEntryService.getEntriesByCustomerAndMonth(customerId, year, month)));
    }

    @GetMapping("/customer-range")
    public ResponseEntity<ApiResponse<List<MilkEntryDto>>> getEntriesByCustomerAndRange(
            @RequestParam String customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entries fetched", milkEntryService.getEntriesByCustomerAndDateRange(customerId, startDate, endDate)));
    }

    @GetMapping("/customer-year-summary")
    public ResponseEntity<ApiResponse<List<MilkYearSummaryDto>>> getCustomerYearSummary(
            @RequestParam String customerId,
            @RequestParam int year) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk year summary fetched", milkEntryService.getMonthlySummaryByCustomerAndYear(customerId, year)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MilkEntryDto>> updateEntry(@PathVariable String id, @RequestBody MilkEntryDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entry updated", milkEntryService.updateMilkEntry(id, dto)));
    }

    @PostMapping("/auto-generate")
    public ResponseEntity<ApiResponse<Integer>> autoGenerateEntries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        int count = milkEntryService.autoGenerateEntries(date);
        String message = count > 0
                ? "Auto-generated " + count + " entries"
                : "Entries already exist for the selected date. Skipped duplicate generation.";
        return ResponseEntity.ok(new ApiResponse<>(true, message, count));
    }

    @PostMapping("/auto-generate-range")
    public ResponseEntity<ApiResponse<Integer>> autoGenerateEntriesRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        int count = milkEntryService.autoGenerateEntriesForRange(startDate, endDate);
        String message = count > 0
                ? "Auto-generated " + count + " entries"
                : "No new entries were needed for the selected dates.";
        return ResponseEntity.ok(new ApiResponse<>(true, message, count));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEntry(@PathVariable String id) {
        milkEntryService.deleteMilkEntry(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Milk entry deleted successfully", null));
    }
}
