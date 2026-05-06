package com.dairy.backend.service;

import com.dairy.backend.dto.ExpenseDto;
import com.dairy.backend.dto.InventoryItemDto;
import com.dairy.backend.entity.Expense;
import com.dairy.backend.entity.InventoryItem;
import com.dairy.backend.repository.ExpenseRepository;
import com.dairy.backend.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final ExpenseRepository expenseRepository;

    // --- Inventory Items ---

    public InventoryItemDto addInventoryItem(InventoryItemDto dto) {
        InventoryItem item = InventoryItem.builder()
                .name(dto.getName())
                .category(dto.getCategory())
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .build();
        return mapToDto(inventoryItemRepository.save(item));
    }

    public List<InventoryItemDto> getAllInventoryItems() {
        return inventoryItemRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // --- Expenses ---

    public ExpenseDto addExpense(ExpenseDto dto) {
        Expense expense = Expense.builder()
                .category(dto.getCategory())
                .description(dto.getDescription())
                .amount(dto.getAmount())
                .date(dto.getDate() != null ? dto.getDate() : LocalDate.now())
                .build();
        return mapToDto(expenseRepository.save(expense));
    }

    public List<ExpenseDto> getAllExpenses() {
        return expenseRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private InventoryItemDto mapToDto(InventoryItem item) {
        return InventoryItemDto.builder()
                .id(item.getId())
                .name(item.getName())
                .category(item.getCategory())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .build();
    }

    private ExpenseDto mapToDto(Expense expense) {
        return ExpenseDto.builder()
                .id(expense.getId())
                .category(expense.getCategory())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .date(expense.getDate())
                .build();
    }
}
