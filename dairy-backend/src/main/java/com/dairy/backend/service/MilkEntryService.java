package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.MilkEntryDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.DeliveryOverride;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.SpecialCondition;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MilkEntryService {

    private final MilkEntryRepository milkEntryRepository;
    private final CustomerRepository customerRepository;

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private boolean clearConsumedCustomerConditions(Customer customer, LocalDate date) {
        boolean changed = false;

        List<LocalDate> skippedDates = customer.getSkippedDates() != null ? customer.getSkippedDates() : new ArrayList<>();
        if (skippedDates.removeIf(date::equals)) {
            customer.setSkippedDates(skippedDates);
            changed = true;
        }

        List<DeliveryOverride> deliveryOverrides = customer.getDeliveryOverrides() != null
                ? customer.getDeliveryOverrides()
                : new ArrayList<>();
        if (deliveryOverrides.removeIf(override -> date.equals(override.getDate()))) {
            customer.setDeliveryOverrides(deliveryOverrides);
            changed = true;
        }

        SpecialCondition specialCondition = customer.getSpecialCondition();
        if (specialCondition != null
                && specialCondition.isActive()
                && !date.isBefore(specialCondition.getStartDate())
                && !date.isAfter(specialCondition.getEndDate())) {
            LocalDate nextStartDate = date.plusDays(1);
            if (nextStartDate.isAfter(specialCondition.getEndDate())) {
                specialCondition.setActive(false);
            } else {
                specialCondition.setStartDate(nextStartDate);
            }
            customer.setSpecialCondition(specialCondition);
            changed = true;
        }

        return changed;
    }

    @Transactional
    public MilkEntryDto addMilkEntry(MilkEntryDto dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Use customer's default rate if not provided
        BigDecimal rate = dto.getRatePerLiter() != null ? dto.getRatePerLiter() : customer.getRatePerLiter();
        
        BigDecimal mQty = dto.getMorningQuantity() != null ? dto.getMorningQuantity() : BigDecimal.ZERO;
        BigDecimal eQty = dto.getEveningQuantity() != null ? dto.getEveningQuantity() : BigDecimal.ZERO;
        
        BigDecimal totalQty = mQty.add(eQty);
        BigDecimal totalAmount = totalQty.multiply(rate);

        MilkEntry entry = MilkEntry.builder()
                .customerId(customer.getId())
                .date(dto.getDate() != null ? dto.getDate() : LocalDate.now())
                .morningQuantity(mQty)
                .eveningQuantity(eQty)
                .fat(dto.getFat())
                .snf(dto.getSnf())
                .ratePerLiter(rate)
                .totalAmount(totalAmount)
                .build();

        entry = milkEntryRepository.save(entry);

        // Update customer balance (Balance increases because dairy owes money to customer/farmer)
        // Note: Depending on whether the customer is buying or selling, logic changes. 
        // Assuming farmer selling to dairy -> Dairy owes Farmer -> Balance increases.
        customer.setBalance(customer.getBalance().add(totalAmount));
        clearConsumedCustomerConditions(customer, entry.getDate());
        customerRepository.save(customer);

        return mapToDto(entry, customer.getName());
    }

    public List<MilkEntryDto> getEntriesByDate(LocalDate date) {
        return milkEntryRepository.findByUserId(SecurityUtils.getCurrentUserId()).stream()
                .filter(entry -> entry.getDate() != null)
                .filter(entry -> entry.getDate().equals(date))
                .map(entry -> {
                    String name = customerRepository.findById(entry.getCustomerId())
                            .map(Customer::getName).orElse("Unknown");
                    return mapToDto(entry, name);
                })
                .collect(Collectors.toList());
    }

    public List<MilkEntryDto> getEntriesByCustomerAndMonth(String customerId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate startDate = ym.atDay(1);
        LocalDate endDate = ym.atEndOfMonth();

        String customerName = customerRepository.findById(customerId)
                .map(Customer::getName).orElse("Unknown");

        return findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), customerId, startDate, endDate).stream()
                .map(entry -> mapToDto(entry, customerName))
                .collect(Collectors.toList());
    }

    public List<MilkEntryDto> getEntriesByCustomerAndDateRange(String customerId, LocalDate startDate, LocalDate endDate) {
        String customerName = customerRepository.findById(customerId)
                .map(Customer::getName).orElse("Unknown");

        return findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), customerId, startDate, endDate).stream()
                .map(entry -> mapToDto(entry, customerName))
                .collect(Collectors.toList());
    }

    public List<MilkEntry> findEntriesByCustomerAndDateRange(String userId, String customerId, LocalDate startDate, LocalDate endDate) {
        return milkEntryRepository.findByUserIdAndCustomerId(userId, customerId).stream()
                .filter(entry -> entry.getDate() != null)
                .filter(entry -> !entry.getDate().isBefore(startDate) && !entry.getDate().isAfter(endDate))
                .sorted(java.util.Comparator.comparing(MilkEntry::getDate))
                .collect(Collectors.toList());
    }

    @Transactional
    public MilkEntryDto updateMilkEntry(String id, MilkEntryDto dto) {
        MilkEntry entry = milkEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Milk entry not found"));

        Customer customer = customerRepository.findById(entry.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        BigDecimal oldAmount = entry.getTotalAmount() != null ? entry.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal rate = dto.getRatePerLiter() != null ? dto.getRatePerLiter() : entry.getRatePerLiter();
        BigDecimal morningQty = dto.getMorningQuantity() != null ? dto.getMorningQuantity() : BigDecimal.ZERO;
        BigDecimal eveningQty = dto.getEveningQuantity() != null ? dto.getEveningQuantity() : BigDecimal.ZERO;
        BigDecimal totalAmount = morningQty.add(eveningQty).multiply(rate);

        entry.setMorningQuantity(morningQty);
        entry.setEveningQuantity(eveningQty);
        entry.setFat(dto.getFat());
        entry.setSnf(dto.getSnf());
        entry.setRatePerLiter(rate);
        entry.setTotalAmount(totalAmount);

        milkEntryRepository.save(entry);

        customer.setBalance(customer.getBalance().subtract(oldAmount).add(totalAmount));
        customerRepository.save(customer);

        return mapToDto(entry, customer.getName());
    }

    private MilkEntryDto mapToDto(MilkEntry entry, String customerName) {
        return MilkEntryDto.builder()
                .id(entry.getId())
                .customerId(entry.getCustomerId())
                .customerName(customerName)
                .date(entry.getDate())
                .morningQuantity(entry.getMorningQuantity())
                .eveningQuantity(entry.getEveningQuantity())
                .fat(entry.getFat())
                .snf(entry.getSnf())
                .ratePerLiter(entry.getRatePerLiter())
                .totalAmount(entry.getTotalAmount())
                .build();
    }

    @Transactional
    public int autoGenerateEntries(LocalDate date) {
        return autoGenerateEntriesForUser(SecurityUtils.getCurrentUserId(), date);
    }

    @Transactional
    public int autoGenerateEntriesForAllUsers(LocalDate date) {
        Map<String, List<Customer>> customersByUser = customerRepository.findAll().stream()
                .filter(Customer::isActive)
                .filter(customer -> customer.getUserId() != null && !customer.getUserId().isBlank())
                .collect(Collectors.groupingBy(Customer::getUserId, LinkedHashMap::new, Collectors.toList()));

        int totalGenerated = 0;
        for (Map.Entry<String, List<Customer>> entry : customersByUser.entrySet()) {
            totalGenerated += autoGenerateEntriesForCustomers(entry.getKey(), entry.getValue(), date);
        }
        return totalGenerated;
    }

    @Transactional
    public int autoGenerateEntriesForUser(String userId, LocalDate date) {
        List<Customer> activeCustomers = customerRepository.findByUserIdAndIsActiveTrue(userId);
        return autoGenerateEntriesForCustomers(userId, activeCustomers, date);
    }

    private int autoGenerateEntriesForCustomers(String userId, List<Customer> activeCustomers, LocalDate date) {
        int generatedCount = 0;

        for (Customer customer : activeCustomers) {
            boolean hasLegacyDailyPlan = customer.getDailyQuantity() != null
                    && customer.getDailyQuantity().compareTo(BigDecimal.ZERO) > 0;
            boolean shouldAutoGenerate = customer.isAutoEntryEnabled() || hasLegacyDailyPlan;
            List<LocalDate> skippedDates = customer.getSkippedDates() != null ? customer.getSkippedDates() : new ArrayList<>();
            DeliveryOverride override = customer.getDeliveryOverrides() == null
                    ? null
                    : customer.getDeliveryOverrides().stream()
                    .filter(item -> date.equals(item.getDate()))
                    .findFirst()
                    .orElse(null);

            if (!shouldAutoGenerate || skippedDates.contains(date) || milkEntryRepository.existsByUserIdAndCustomerIdAndDate(userId, customer.getId(), date)) {
                continue;
            }

            BigDecimal morningQty = safe(customer.getDefaultMorningQuantity());
            BigDecimal eveningQty = safe(customer.getDefaultEveningQuantity());

            // Backward compatibility for existing customers already using dailyQuantity.
            if (morningQty.compareTo(BigDecimal.ZERO) == 0
                    && eveningQty.compareTo(BigDecimal.ZERO) == 0
                    && hasLegacyDailyPlan) {
                eveningQty = customer.getDailyQuantity();
            }

            if (override != null && override.getQuantity() != null) {
                morningQty = BigDecimal.ZERO;
                eveningQty = override.getQuantity();
            } else if (customer.getSpecialCondition() != null &&
                    customer.getSpecialCondition().isActive() &&
                    !date.isBefore(customer.getSpecialCondition().getStartDate()) &&
                    !date.isAfter(customer.getSpecialCondition().getEndDate())) {
                morningQty = BigDecimal.ZERO;
                eveningQty = customer.getSpecialCondition().getQuantity();
            }

            BigDecimal totalQty = morningQty.add(eveningQty);
            if (totalQty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal rate = customer.getRatePerLiter();
            BigDecimal totalAmount = totalQty.multiply(rate);

            MilkEntry entry = MilkEntry.builder()
                    .userId(userId)
                    .customerId(customer.getId())
                    .date(date)
                    .morningQuantity(morningQty)
                    .eveningQuantity(eveningQty)
                    .ratePerLiter(rate)
                    .totalAmount(totalAmount)
                    .build();

            milkEntryRepository.save(entry);

            customer.setBalance(customer.getBalance().add(totalAmount));
            clearConsumedCustomerConditions(customer, date);
            customerRepository.save(customer);
            generatedCount++;
        }
        return generatedCount;
    }

    @Transactional
    public void deleteMilkEntry(String id) {
        MilkEntry entry = milkEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Milk entry not found"));

        customerRepository.findById(entry.getCustomerId()).ifPresent(customer -> {
            // Deduct the entry's total amount from the customer's balance
            customer.setBalance(customer.getBalance().subtract(entry.getTotalAmount()));
            customerRepository.save(customer);
        });

        milkEntryRepository.delete(entry);
    }
}
