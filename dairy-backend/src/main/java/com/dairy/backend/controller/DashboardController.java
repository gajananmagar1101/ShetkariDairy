package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.DashboardSummaryDto;
import com.dairy.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryDto>> getSummary() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Dashboard summary fetched", dashboardService.getSummary()));
    }
}
