package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.DeliveryOverride;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final MilkEntryRepository milkEntryRepository;
    private final MilkEntryService milkEntryService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal resolveDailyQuantity(CustomerDto dto) {
        if (dto.getDailyQuantity() != null) {
            return dto.getDailyQuantity();
        }
        return safe(dto.getDefaultMorningQuantity()).add(safe(dto.getDefaultEveningQuantity()));
    }

    private BigDecimal calculateLiveBalance(String userId, Customer customer) {
        Map<LocalDate, BigDecimal> entryAmountByDate = new HashMap<>();
        BigDecimal milkEntriesTotal = milkEntryRepository.findByUserIdAndCustomerId(userId, customer.getId()).stream()
                .peek(entry -> {
                    if (entry.getDate() != null) {
                        entryAmountByDate.merge(entry.getDate(), safe(entry.getTotalAmount()), BigDecimal::add);
                    }
                })
                .map(entry -> safe(entry.getTotalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Set<LocalDate> coveredPaidDates = new HashSet<>();
        BigDecimal rangedPaymentsTotal = BigDecimal.ZERO;
        BigDecimal manualPaymentsTotal = BigDecimal.ZERO;

        var payments = paymentRepository.findByUserIdAndCustomerId(userId, customer.getId()).stream()
                .sorted(Comparator
                        .comparing(com.dairy.backend.entity.Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(com.dairy.backend.entity.Payment::getId, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());

        for (var payment : payments) {
            if (payment.getPaidFromDate() != null && payment.getPaidToDate() != null) {
                for (LocalDate date = payment.getPaidFromDate(); !date.isAfter(payment.getPaidToDate()); date = date.plusDays(1)) {
                    if (coveredPaidDates.add(date)) {
                        rangedPaymentsTotal = rangedPaymentsTotal.add(entryAmountByDate.getOrDefault(date, BigDecimal.ZERO));
                    }
                }
                continue;
            }

            manualPaymentsTotal = manualPaymentsTotal.add(safe(payment.getAmount()));
        }

        return milkEntriesTotal.subtract(rangedPaymentsTotal).subtract(manualPaymentsTotal);
    }

    public CustomerDto createCustomer(CustomerDto dto) {
        Customer customer = Customer.builder()
                .name(dto.getName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .joinedDate(LocalDate.now())
                .balance(BigDecimal.ZERO)
                .milkType(dto.getMilkType())
                .ratePerLiter(dto.getRatePerLiter())
                .dailyQuantity(resolveDailyQuantity(dto))
                .autoEntryEnabled(Boolean.TRUE.equals(dto.getAutoEntryEnabled()))
                .defaultMorningQuantity(safe(dto.getDefaultMorningQuantity()))
                .defaultEveningQuantity(safe(dto.getDefaultEveningQuantity()))
                .skippedDates(dto.getSkippedDates() != null ? dto.getSkippedDates() : new ArrayList<>())
                .deliveryOverrides(dto.getDeliveryOverrides() != null ? dto.getDeliveryOverrides() : new ArrayList<>())
                .specialCondition(dto.getSpecialCondition())
                .isActive(dto.getActive() == null || dto.getActive())
                .stoppedAt(dto.getActive() != null && !dto.getActive() ? LocalDateTime.now() : null)
                .build();

        customer = customerRepository.save(customer);
        return mapToDto(customer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), customer));
    }

    public List<CustomerDto> getAllCustomers() {
        String userId = SecurityUtils.getCurrentUserId();
        return customerRepository.findByUserId(userId).stream()
                .map(customer -> mapToDto(customer, calculateLiveBalance(userId, customer)))
                .collect(Collectors.toList());
    }

    public void deleteCustomer(String id) {
        milkEntryRepository.deleteByUserIdAndCustomerId(SecurityUtils.getCurrentUserId(), id);
        invoiceRepository.deleteByUserIdAndCustomerId(SecurityUtils.getCurrentUserId(), id);
        paymentRepository.deleteByUserIdAndCustomerId(SecurityUtils.getCurrentUserId(), id);
        customerRepository.deleteById(id);
    }

    public CustomerDto updateCustomer(String id, CustomerDto dto) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));
        customer.setName(dto.getName());
        customer.setPhone(dto.getPhone());
        customer.setAddress(dto.getAddress());
        customer.setMilkType(dto.getMilkType());
        customer.setRatePerLiter(dto.getRatePerLiter());
        customer.setDailyQuantity(resolveDailyQuantity(dto));
        customer.setAutoEntryEnabled(Boolean.TRUE.equals(dto.getAutoEntryEnabled()));
        customer.setDefaultMorningQuantity(safe(dto.getDefaultMorningQuantity()));
        customer.setDefaultEveningQuantity(safe(dto.getDefaultEveningQuantity()));
        if (dto.getSkippedDates() != null) {
            customer.setSkippedDates(dto.getSkippedDates());
        }
        if (dto.getDeliveryOverrides() != null) {
            customer.setDeliveryOverrides(dto.getDeliveryOverrides());
        }
        if (dto.getSpecialCondition() != null) {
            customer.setSpecialCondition(dto.getSpecialCondition());
        }
        if (dto.getActive() != null) {
            customer.setActive(dto.getActive());
            customer.setStoppedAt(dto.getActive() ? null : (customer.getStoppedAt() != null ? customer.getStoppedAt() : LocalDateTime.now()));
        }
        // Do not update balance or joinedDate during normal edit
        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    public CustomerDto setCustomerActive(String id, boolean active) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));
        customer.setActive(active);
        customer.setStoppedAt(active ? null : LocalDateTime.now());
        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    public CustomerDto markNoDelivery(String id, LocalDate startDate, LocalDate endDate) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));

        List<LocalDate> skippedDates = customer.getSkippedDates() != null ? customer.getSkippedDates() : new ArrayList<>();
        
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            if (!skippedDates.contains(date)) {
                skippedDates.add(date);
            }
            LocalDate currentDate = date;
            milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), id, currentDate, currentDate).stream().findFirst().ifPresent(entry -> {
                customer.setBalance(customer.getBalance().subtract(entry.getTotalAmount()));
                milkEntryRepository.delete(entry);
            });
        }
        
        customer.setSkippedDates(skippedDates);

        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    public CustomerDto setDeliveryOverride(String id, LocalDate startDate, LocalDate endDate, BigDecimal quantity) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));

        List<DeliveryOverride> overrides = customer.getDeliveryOverrides() != null ? customer.getDeliveryOverrides() : new ArrayList<>();
        List<LocalDate> skippedDates = customer.getSkippedDates() != null ? customer.getSkippedDates() : new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            LocalDate currentDate = date;
            overrides.removeIf(override -> currentDate.equals(override.getDate()));
            overrides.add(DeliveryOverride.builder().date(currentDate).quantity(quantity).build());
            
            skippedDates.removeIf(currentDate::equals);
            
            milkEntryService.findEntriesByCustomerAndDateRange(SecurityUtils.getCurrentUserId(), id, currentDate, currentDate).stream().findFirst().ifPresent(entry -> {
                customer.setBalance(customer.getBalance().subtract(entry.getTotalAmount()));
                milkEntryRepository.delete(entry);
            });
        }
        
        customer.setDeliveryOverrides(overrides);
        customer.setSkippedDates(skippedDates);

        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    public CustomerDto removeNoDelivery(String id, LocalDate date) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));
        if (customer.getSkippedDates() != null) {
            customer.getSkippedDates().removeIf(date::equals);
        }
        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    public CustomerDto removeDeliveryOverride(String id, LocalDate date) {
        Customer customer = customerRepository.findById(id).orElseThrow(() -> new RuntimeException("Customer not found"));
        if (customer.getDeliveryOverrides() != null) {
            customer.getDeliveryOverrides().removeIf(override -> date.equals(override.getDate()));
        }
        Customer savedCustomer = customerRepository.save(customer);
        return mapToDto(savedCustomer, calculateLiveBalance(SecurityUtils.getCurrentUserId(), savedCustomer));
    }

    private CustomerDto mapToDto(Customer customer, BigDecimal balance) {
        return CustomerDto.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .balance(balance)
                .milkType(customer.getMilkType())
                .ratePerLiter(customer.getRatePerLiter())
                .dailyQuantity(customer.getDailyQuantity())
                .autoEntryEnabled(customer.isAutoEntryEnabled())
                .defaultMorningQuantity(customer.getDefaultMorningQuantity())
                .defaultEveningQuantity(customer.getDefaultEveningQuantity())
                .skippedDates(customer.getSkippedDates())
                .deliveryOverrides(customer.getDeliveryOverrides())
                .specialCondition(customer.getSpecialCondition())
                .active(customer.isActive())
                .stoppedAt(customer.getStoppedAt())
                .build();
    }
}
