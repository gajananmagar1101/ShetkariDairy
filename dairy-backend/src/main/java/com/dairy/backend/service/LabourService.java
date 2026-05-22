package com.dairy.backend.service;

import com.dairy.backend.dto.LabourAttendanceDto;
import com.dairy.backend.dto.LabourRecoveryDto;
import com.dairy.backend.dto.LabourWorkerDto;
import com.dairy.backend.entity.AttendanceStatus;
import com.dairy.backend.entity.LabourAttendance;
import com.dairy.backend.entity.LabourRecovery;
import com.dairy.backend.entity.LabourWorker;
import com.dairy.backend.repository.LabourAttendanceRepository;
import com.dairy.backend.repository.LabourRecoveryRepository;
import com.dairy.backend.repository.LabourWorkerRepository;
import com.dairy.backend.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LabourService {

    private static final BigDecimal DAYS_IN_YEAR = new BigDecimal("365");
    private static final BigDecimal HALF_DAY_FACTOR = new BigDecimal("0.5");

    private final LabourWorkerRepository labourWorkerRepository;
    private final LabourAttendanceRepository labourAttendanceRepository;
    private final LabourRecoveryRepository labourRecoveryRepository;

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private LocalDate resolveContractStartDate(LabourWorker worker) {
        if (worker.getContractStartDate() != null) {
            return worker.getContractStartDate();
        }
        if (worker.getJoinDate() != null) {
            return worker.getJoinDate();
        }
        return LocalDate.now();
    }

    private LocalDate resolveContractEndDate(LabourWorker worker) {
        return resolveContractStartDate(worker).plusYears(1).minusDays(1);
    }

    private BigDecimal calculateDailyRate(LabourWorker worker) {
        BigDecimal contractAmount = safe(worker.getContractAmount());
        if (contractAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return contractAmount.divide(DAYS_IN_YEAR, 2, RoundingMode.HALF_UP);
    }

    private LabourWorker requireWorker(String id, String userId) {
        return labourWorkerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Worker not found"));
    }

    private LabourWorkerDto mapWorkerToDto(LabourWorker worker) {
        String userId = SecurityUtils.getCurrentUserId();
        LocalDate contractStart = resolveContractStartDate(worker);
        LocalDate contractEnd = resolveContractEndDate(worker);
        BigDecimal dailyRate = calculateDailyRate(worker);

        List<LabourAttendance> attendanceEntries = labourAttendanceRepository.findByUserIdAndWorkerId(userId, worker.getId());
        long totalAbsentDays = attendanceEntries.stream()
                .filter(attendance -> attendance.getStatus() == AttendanceStatus.ABSENT)
                .count();
        long totalHalfDays = attendanceEntries.stream()
                .filter(attendance -> attendance.getStatus() == AttendanceStatus.HALF_DAY)
                .count();

        BigDecimal totalDeduction = dailyRate.multiply(BigDecimal.valueOf(totalAbsentDays))
                .add(dailyRate.multiply(HALF_DAY_FACTOR).multiply(BigDecimal.valueOf(totalHalfDays)))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalRecovered = labourRecoveryRepository.findByUserIdAndWorkerIdAndRecoveryDateBetween(
                        userId,
                        worker.getId(),
                        contractStart,
                        contractEnd
                ).stream()
                .map(LabourRecovery::getAmount)
                .map(this::safe)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal pendingRecovery = totalDeduction.subtract(totalRecovered);
        if (pendingRecovery.compareTo(BigDecimal.ZERO) < 0) {
            pendingRecovery = BigDecimal.ZERO;
        }

        return LabourWorkerDto.builder()
                .id(worker.getId())
                .name(worker.getName())
                .phone(worker.getPhone())
                .address(worker.getAddress())
                .workType(worker.getWorkType())
                .joinDate(worker.getJoinDate())
                .contractStartDate(contractStart)
                .contractEndDate(contractEnd)
                .contractAmount(safe(worker.getContractAmount()).setScale(2, RoundingMode.HALF_UP))
                .upfrontPaidAmount(safe(worker.getUpfrontPaidAmount()).setScale(2, RoundingMode.HALF_UP))
                .upfrontPaidDate(worker.getUpfrontPaidDate())
                .active(worker.isActive())
                .notes(worker.getNotes())
                .dailyRate(dailyRate)
                .totalAbsentDays(totalAbsentDays)
                .totalHalfDays(totalHalfDays)
                .totalDeduction(totalDeduction)
                .totalRecovered(totalRecovered)
                .pendingRecovery(pendingRecovery.setScale(2, RoundingMode.HALF_UP))
                .build();
    }

    @Transactional
    public LabourWorkerDto createWorker(LabourWorkerDto dto) {
        String userId = SecurityUtils.getCurrentUserId();
        labourWorkerRepository.findByUserIdAndPhone(userId, dto.getPhone())
                .ifPresent(existing -> {
                    throw new RuntimeException("Worker with this phone already exists");
                });

        LocalDate contractStart = dto.getContractStartDate() != null ? dto.getContractStartDate() : dto.getJoinDate();
        BigDecimal contractAmount = safe(dto.getContractAmount());
        BigDecimal upfrontPaidAmount = dto.getUpfrontPaidAmount() != null ? dto.getUpfrontPaidAmount() : contractAmount;

        LabourWorker worker = LabourWorker.builder()
                .userId(userId)
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .workType(dto.getWorkType())
                .joinDate(dto.getJoinDate())
                .contractStartDate(contractStart)
                .contractAmount(contractAmount)
                .upfrontPaidAmount(upfrontPaidAmount)
                .upfrontPaidDate(dto.getUpfrontPaidDate() != null ? dto.getUpfrontPaidDate() : contractStart)
                .active(dto.getActive() == null || dto.getActive())
                .notes(dto.getNotes())
                .build();

        return mapWorkerToDto(labourWorkerRepository.save(worker));
    }

    @Transactional
    public LabourWorkerDto updateWorker(String id, LabourWorkerDto dto) {
        String userId = SecurityUtils.getCurrentUserId();
        LabourWorker worker = requireWorker(id, userId);

        if (dto.getPhone() != null && !dto.getPhone().equals(worker.getPhone())) {
            labourWorkerRepository.findByUserIdAndPhone(userId, dto.getPhone())
                    .ifPresent(existing -> {
                        throw new RuntimeException("Worker with this phone already exists");
                    });
        }

        worker.setName(dto.getName());
        worker.setPhone(dto.getPhone());
        worker.setAddress(dto.getAddress());
        worker.setWorkType(dto.getWorkType());
        worker.setJoinDate(dto.getJoinDate());
        worker.setContractStartDate(dto.getContractStartDate() != null ? dto.getContractStartDate() : dto.getJoinDate());
        worker.setContractAmount(safe(dto.getContractAmount()));
        worker.setUpfrontPaidAmount(dto.getUpfrontPaidAmount() != null ? dto.getUpfrontPaidAmount() : safe(dto.getContractAmount()));
        worker.setUpfrontPaidDate(dto.getUpfrontPaidDate());
        worker.setActive(dto.getActive() == null || dto.getActive());
        worker.setNotes(dto.getNotes());

        return mapWorkerToDto(labourWorkerRepository.save(worker));
    }

    public List<LabourWorkerDto> getAllWorkers() {
        return labourWorkerRepository.findByUserIdOrderByActiveDescNameAsc(SecurityUtils.getCurrentUserId()).stream()
                .map(this::mapWorkerToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteWorker(String id) {
        String userId = SecurityUtils.getCurrentUserId();
        requireWorker(id, userId);
        labourAttendanceRepository.deleteByUserIdAndWorkerId(userId, id);
        labourRecoveryRepository.deleteByUserIdAndWorkerId(userId, id);
        labourWorkerRepository.deleteByIdAndUserId(id, userId);
    }

    public List<LabourAttendanceDto> getAttendanceByDate(LocalDate date) {
        String userId = SecurityUtils.getCurrentUserId();
        List<LabourWorker> workers = labourWorkerRepository.findByUserIdAndActiveTrueOrderByNameAsc(userId);
        Map<String, LabourAttendance> attendanceByWorkerId = labourAttendanceRepository.findByUserIdAndDate(userId, date).stream()
                .collect(Collectors.toMap(LabourAttendance::getWorkerId, Function.identity()));

        return workers.stream()
                .map(worker -> {
                    LabourAttendance attendance = attendanceByWorkerId.get(worker.getId());
                    return LabourAttendanceDto.builder()
                            .id(attendance != null ? attendance.getId() : null)
                            .workerId(worker.getId())
                            .workerName(worker.getName())
                            .date(date)
                            .status(attendance != null ? attendance.getStatus() : null)
                            .reason(attendance != null ? attendance.getReason() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<LabourAttendanceDto> getAttendanceHistory(String workerId) {
        String userId = SecurityUtils.getCurrentUserId();
        LabourWorker worker = requireWorker(workerId, userId);

        return labourAttendanceRepository.findByUserIdAndWorkerId(userId, workerId).stream()
                .sorted(Comparator.comparing(LabourAttendance::getDate).reversed())
                .map(attendance -> LabourAttendanceDto.builder()
                        .id(attendance.getId())
                        .workerId(workerId)
                        .workerName(worker.getName())
                        .date(attendance.getDate())
                        .status(attendance.getStatus())
                        .reason(attendance.getReason())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public LabourAttendanceDto saveAttendance(LabourAttendanceDto dto) {
        String userId = SecurityUtils.getCurrentUserId();
        LabourWorker worker = requireWorker(dto.getWorkerId(), userId);

        if (dto.getDate() == null) {
            throw new RuntimeException("Attendance date is required");
        }
        if (dto.getStatus() == null) {
            throw new RuntimeException("Attendance status is required");
        }

        LabourAttendance attendance = labourAttendanceRepository
                .findByUserIdAndWorkerIdAndDate(userId, dto.getWorkerId(), dto.getDate())
                .orElse(LabourAttendance.builder()
                        .userId(userId)
                        .workerId(dto.getWorkerId())
                        .date(dto.getDate())
                        .build());

        attendance.setStatus(dto.getStatus());
        if (dto.getStatus() == AttendanceStatus.PRESENT) {
            attendance.setReason(null);
        } else {
            String normalizedReason = dto.getReason() != null ? dto.getReason().trim() : "";
            attendance.setReason(normalizedReason.isEmpty() ? null : normalizedReason);
        }
        LabourAttendance saved = labourAttendanceRepository.save(attendance);

        return LabourAttendanceDto.builder()
                .id(saved.getId())
                .workerId(saved.getWorkerId())
                .workerName(worker.getName())
                .date(saved.getDate())
                .status(saved.getStatus())
                .reason(saved.getReason())
                .build();
    }

    public List<LabourRecoveryDto> getRecoveries() {
        String userId = SecurityUtils.getCurrentUserId();
        Map<String, String> workerNameById = labourWorkerRepository.findByUserIdOrderByActiveDescNameAsc(userId).stream()
                .collect(Collectors.toMap(LabourWorker::getId, LabourWorker::getName));

        return labourRecoveryRepository.findByUserIdOrderByRecoveryDateDescCreatedAtDesc(userId).stream()
                .map(recovery -> LabourRecoveryDto.builder()
                        .id(recovery.getId())
                        .workerId(recovery.getWorkerId())
                        .workerName(workerNameById.getOrDefault(recovery.getWorkerId(), "Unknown"))
                        .recoveryDate(recovery.getRecoveryDate())
                        .amount(safe(recovery.getAmount()).setScale(2, RoundingMode.HALF_UP))
                        .paymentMethod(recovery.getPaymentMethod())
                        .notes(recovery.getNotes())
                        .build())
                .sorted(Comparator
                        .comparing(LabourRecoveryDto::getRecoveryDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(LabourRecoveryDto::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional
    public int autoMarkAttendanceForUser(String userId, LocalDate date) {
        List<LabourWorker> workers = labourWorkerRepository.findByUserIdAndActiveTrueOrderByNameAsc(userId);
        Map<String, LabourAttendance> attendanceByWorkerId = labourAttendanceRepository.findByUserIdAndDate(userId, date).stream()
                .collect(Collectors.toMap(LabourAttendance::getWorkerId, Function.identity()));

        int markedCount = 0;
        for (LabourWorker worker : workers) {
            if (attendanceByWorkerId.containsKey(worker.getId())) {
                continue;
            }

            LabourAttendance attendance = LabourAttendance.builder()
                    .userId(userId)
                    .workerId(worker.getId())
                    .date(date)
                    .status(AttendanceStatus.PRESENT)
                    .reason(null)
                    .build();
            labourAttendanceRepository.save(attendance);
            markedCount++;
        }

        return markedCount;
    }

    @Transactional
    public LabourRecoveryDto addRecovery(LabourRecoveryDto dto) {
        String userId = SecurityUtils.getCurrentUserId();
        LabourWorker worker = requireWorker(dto.getWorkerId(), userId);

        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Recovery amount must be greater than zero");
        }

        LabourRecovery recovery = LabourRecovery.builder()
                .userId(userId)
                .workerId(dto.getWorkerId())
                .recoveryDate(dto.getRecoveryDate() != null ? dto.getRecoveryDate() : LocalDate.now())
                .amount(dto.getAmount())
                .paymentMethod(dto.getPaymentMethod())
                .notes(dto.getNotes())
                .build();

        LabourRecovery saved = labourRecoveryRepository.save(recovery);
        return LabourRecoveryDto.builder()
                .id(saved.getId())
                .workerId(saved.getWorkerId())
                .workerName(worker.getName())
                .recoveryDate(saved.getRecoveryDate())
                .amount(saved.getAmount().setScale(2, RoundingMode.HALF_UP))
                .paymentMethod(saved.getPaymentMethod())
                .notes(saved.getNotes())
                .build();
    }
}
