package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.ExpenseDto;
import com.dairy.backend.dto.InventoryItemDto;
import com.dairy.backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<InventoryItemDto>> addItem(@RequestBody InventoryItemDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Item added", inventoryService.addInventoryItem(dto)));
    }

    @GetMapping("/items")
    public ResponseEntity<ApiResponse<List<InventoryItemDto>>> getItems() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Items fetched", inventoryService.getAllInventoryItems()));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<ExpenseDto>> addExpense(@RequestBody ExpenseDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Expense added", inventoryService.addExpense(dto)));
    }

    @GetMapping("/expenses")
    public ResponseEntity<ApiResponse<List<ExpenseDto>>> getExpenses() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Expenses fetched", inventoryService.getAllExpenses()));
    }
}
