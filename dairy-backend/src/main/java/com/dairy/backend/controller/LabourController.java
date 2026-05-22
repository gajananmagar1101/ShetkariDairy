package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.LabourAttendanceDto;
import com.dairy.backend.dto.LabourRecoveryDto;
import com.dairy.backend.dto.LabourWorkerDto;
import com.dairy.backend.service.LabourService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/labour")
@RequiredArgsConstructor
public class LabourController {

    private final LabourService labourService;

    @GetMapping("/workers")
    public ResponseEntity<ApiResponse<List<LabourWorkerDto>>> getWorkers() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour workers fetched", labourService.getAllWorkers()));
    }

    @PostMapping("/workers")
    public ResponseEntity<ApiResponse<LabourWorkerDto>> createWorker(@RequestBody LabourWorkerDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour worker created", labourService.createWorker(dto)));
    }

    @PutMapping("/workers/{id}")
    public ResponseEntity<ApiResponse<LabourWorkerDto>> updateWorker(
            @PathVariable String id,
            @RequestBody LabourWorkerDto dto
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour worker updated", labourService.updateWorker(id, dto)));
    }

    @DeleteMapping("/workers/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWorker(@PathVariable String id) {
        labourService.deleteWorker(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour worker deleted", null));
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<LabourAttendanceDto>>> getAttendance(
            @RequestParam LocalDate date
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour attendance fetched", labourService.getAttendanceByDate(date)));
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<ApiResponse<List<LabourAttendanceDto>>> getAttendanceHistory(
            @RequestParam String workerId
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour attendance history fetched", labourService.getAttendanceHistory(workerId)));
    }

    @PostMapping("/attendance")
    public ResponseEntity<ApiResponse<LabourAttendanceDto>> saveAttendance(@RequestBody LabourAttendanceDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour attendance saved", labourService.saveAttendance(dto)));
    }

    @GetMapping("/recoveries")
    public ResponseEntity<ApiResponse<List<LabourRecoveryDto>>> getRecoveries() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour recoveries fetched", labourService.getRecoveries()));
    }

    @PostMapping("/recoveries")
    public ResponseEntity<ApiResponse<LabourRecoveryDto>> addRecovery(@RequestBody LabourRecoveryDto dto) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Labour recovery recorded", labourService.addRecovery(dto)));
    }
}
