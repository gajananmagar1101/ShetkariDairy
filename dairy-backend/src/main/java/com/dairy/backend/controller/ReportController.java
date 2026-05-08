package com.dairy.backend.controller;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.entity.Expense;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.repository.ExpenseRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final MilkEntryRepository milkEntryRepository;
    private final ExpenseRepository expenseRepository;

    @Data
    public static class DailySummary {
        private String date;
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal expenses = BigDecimal.ZERO;
        private BigDecimal profit = BigDecimal.ZERO;

        public DailySummary(String date) {
            this.date = date;
        }
    }

    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<List<DailySummary>>> getMonthlyReport(
            @RequestParam int year, @RequestParam int month) {
        
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<MilkEntry> entries = milkEntryRepository.findByUserIdAndDateBetween(SecurityUtils.getCurrentUserId(), startDate, endDate);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetween(SecurityUtils.getCurrentUserId(), startDate, endDate);

        Map<String, DailySummary> map = new TreeMap<>();
        for (int i = 1; i <= startDate.lengthOfMonth(); i++) {
            String d = LocalDate.of(year, month, i).toString();
            map.put(d, new DailySummary(d));
        }

        for (MilkEntry e : entries) {
            String d = e.getDate().toString();
            DailySummary s = map.get(d);
            if (s != null) {
                s.setRevenue(s.getRevenue().add(e.getTotalAmount()));
            }
        }

        for (Expense e : expenses) {
            String d = e.getDate().toString();
            DailySummary s = map.get(d);
            if (s != null) {
                s.setExpenses(s.getExpenses().add(e.getAmount()));
            }
        }

        for (DailySummary s : map.values()) {
            s.setProfit(s.getRevenue().subtract(s.getExpenses()));
        }

        return ResponseEntity.ok(new ApiResponse<>(true, "Report generated", new ArrayList<>(map.values())));
    }
}
