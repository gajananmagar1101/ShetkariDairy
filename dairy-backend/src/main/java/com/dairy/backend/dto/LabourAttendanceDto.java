package com.dairy.backend.dto;

import com.dairy.backend.entity.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabourAttendanceDto {
    private String id;
    private String workerId;
    private String workerName;
    private LocalDate date;
    private AttendanceStatus status;
    private String reason;
}
