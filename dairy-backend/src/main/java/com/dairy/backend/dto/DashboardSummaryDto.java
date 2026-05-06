package com.dairy.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class DashboardSummaryDto {
    private BigDecimal totalMilkToday;
    private long activeCustomers;
    private BigDecimal todaysCollection;
    private String growth;
    private List<WeeklyTrend> weeklyTrends;

    @Data
    @Builder
    public static class WeeklyTrend {
        private String name;
        private BigDecimal milk;
        private BigDecimal amount;
    }
}
