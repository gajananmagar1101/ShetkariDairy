package com.dairy.backend.service;

import com.dairy.backend.dto.DashboardSummaryDto;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MilkEntryRepository milkEntryRepository;
    private final CustomerRepository customerRepository;

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public DashboardSummaryDto getSummary() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Active Customers
        long activeCustomers = customerRepository.countByIsActiveTrue();

        // Today's Stats
        List<MilkEntry> todaysEntries = milkEntryRepository.findByDate(today);
        BigDecimal totalMilkToday = BigDecimal.ZERO;
        BigDecimal todaysCollection = BigDecimal.ZERO;

        for (MilkEntry entry : todaysEntries) {
            totalMilkToday = totalMilkToday.add(nz(entry.getMorningQuantity())).add(nz(entry.getEveningQuantity()));
            todaysCollection = todaysCollection.add(nz(entry.getTotalAmount()));
        }

        // Yesterday's Stats for Growth Calculation
        List<MilkEntry> yesterdaysEntries = milkEntryRepository.findByDate(yesterday);
        BigDecimal yesterdaysCollection = BigDecimal.ZERO;
        for (MilkEntry entry : yesterdaysEntries) {
            yesterdaysCollection = yesterdaysCollection.add(nz(entry.getTotalAmount()));
        }

        // Calculate Growth %
        String growth = "+0.0%";
        if (yesterdaysCollection.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff = todaysCollection.subtract(yesterdaysCollection);
            BigDecimal percentage = diff.divide(yesterdaysCollection, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(1, RoundingMode.HALF_UP);
            
            if (percentage.compareTo(BigDecimal.ZERO) >= 0) {
                growth = "+" + percentage.toString() + "%";
            } else {
                growth = percentage.toString() + "%";
            }
        } else if (todaysCollection.compareTo(BigDecimal.ZERO) > 0) {
            growth = "+100.0%";
        }

        // Weekly Trends (Last 7 days)
        LocalDate startDate = today.minusDays(6);
        List<MilkEntry> weeklyEntries = milkEntryRepository.findByDateBetween(startDate, today);
        
        Map<LocalDate, DashboardSummaryDto.WeeklyTrend> trendMap = new TreeMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE"); // "Mon", "Tue"

        // Initialize map with last 7 days
        for (int i = 0; i < 7; i++) {
            LocalDate d = startDate.plusDays(i);
            trendMap.put(d, DashboardSummaryDto.WeeklyTrend.builder()
                    .name(d.format(formatter))
                    .milk(BigDecimal.ZERO)
                    .amount(BigDecimal.ZERO)
                    .build());
        }

        // Aggregate data
        for (MilkEntry entry : weeklyEntries) {
            DashboardSummaryDto.WeeklyTrend trend = trendMap.get(entry.getDate());
            if (trend != null) {
                trend.setMilk(trend.getMilk().add(nz(entry.getMorningQuantity())).add(nz(entry.getEveningQuantity())));
                trend.setAmount(trend.getAmount().add(nz(entry.getTotalAmount())));
            }
        }

        List<DashboardSummaryDto.WeeklyTrend> trendsList = new ArrayList<>(trendMap.values());

        return DashboardSummaryDto.builder()
                .totalMilkToday(totalMilkToday)
                .activeCustomers(activeCustomers)
                .todaysCollection(todaysCollection)
                .growth(growth)
                .weeklyTrends(trendsList)
                .build();
    }
}
