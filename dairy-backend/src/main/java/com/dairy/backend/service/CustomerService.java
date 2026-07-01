package com.dairy.backend.service;

import com.dairy.backend.util.SecurityUtils;

import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.DeliveryOverride;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import com.dairy.backend.repository.UserRepository;
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
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final MilkEntryRepository milkEntryRepository;
    private final MilkEntryService milkEntryService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    private static class CustomerRecentSummary {
        private LocalDate date;
        private BigDecimal quantity = BigDecimal.ZERO;
        private BigDecimal amount = BigDecimal.ZERO;
        private boolean skipped;
    }

    private static class DailyEntryAggregate {
        private BigDecimal quantity = BigDecimal.ZERO;
        private BigDecimal amount = BigDecimal.ZERO;

        private void add(com.dairy.backend.entity.MilkEntry entry) {
            quantity = quantity.add(
                    safeStatic(entry.getMorningQuantity()).add(safeStatic(entry.getEveningQuantity()))
            );
            amount = amount.add(safeStatic(entry.getTotalAmount()));
        }
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal safeStatic(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private Set<String> resolveOwnedUserIds(String userId) {
        Set<String> ownedUserIds = new HashSet<>();
        userRepository.findById(userId)
                .or(() -> userRepository.findByEmail(userId))
                .or(() -> userRepository.findByPhone(userId))
                .ifPresentOrElse(
                        user -> {
                            if (user.getId() != null && !user.getId().isBlank()) {
                                ownedUserIds.add(user.getId());
                            }
                            if (user.getPhone() != null && !user.getPhone().isBlank()) {
                                ownedUserIds.add(user.getPhone());
                            }
                            if (user.getEmail() != null && !user.getEmail().isBlank()) {
                                ownedUserIds.add(user.getEmail());
                            }
                        },
                        () -> {
                            if (userId != null && !userId.isBlank()) {
                                ownedUserIds.add(userId);
                            }
                        }
        );
        return ownedUserIds;
    }

    private Set<String> resolveOwnedCustomerIds(Set<String> ownedUserIds) {
        Set<String> ownedCustomerIds = new HashSet<>();
        ownedUserIds.forEach(ownedUserId ->
                customerRepository.findByUserId(ownedUserId).forEach(customer -> {
                    if (customer.getId() != null && !customer.getId().isBlank()) {
                        ownedCustomerIds.add(customer.getId());
                    }
                })
        );
        return ownedCustomerIds;
    }

    private BigDecimal resolveDailyQuantity(CustomerDto dto) {
        if (dto.getDailyQuantity() != null) {
            return dto.getDailyQuantity();
        }
        return safe(dto.getDefaultMorningQuantity()).add(safe(dto.getDefaultEveningQuantity()));
    }

    private BigDecimal calculateLiveBalanceFromCollections(
            Customer customer,
            List<com.dairy.backend.entity.MilkEntry> milkEntries,
            List<com.dairy.backend.entity.Invoice> invoices,
            List<com.dairy.backend.entity.Payment> payments
    ) {
        BigDecimal milkEntriesTotal = milkEntries.stream()
                .filter(entry -> customer.getId().equals(entry.getCustomerId()))
                .map(entry -> safe(entry.getTotalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal paidInvoicesTotal = invoices.stream()
                .filter(invoice -> customer.getId().equals(invoice.getCustomerId()))
                .map(invoice -> safe(invoice.getPaidAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal manualPaymentsTotal = payments.stream()
                .filter(payment -> customer.getId().equals(payment.getCustomerId()))
                .filter(payment -> payment.getPaidFromDate() == null || payment.getPaidToDate() == null)
                .map(payment -> safe(payment.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return milkEntriesTotal.subtract(paidInvoicesTotal).subtract(manualPaymentsTotal);
    }

    private BigDecimal calculateLiveBalance(String userId, Customer customer) {
        Set<String> ownedUserIds = resolveOwnedUserIds(userId);
        List<com.dairy.backend.entity.MilkEntry> milkEntries = milkEntryRepository.findByUserIdIn(ownedUserIds);
        List<com.dairy.backend.entity.Invoice> invoices = invoiceRepository.findByUserIdIn(ownedUserIds, Sort.by(Sort.Direction.ASC, "createdAt"));
        List<com.dairy.backend.entity.Payment> payments = paymentRepository.findByUserIdIn(ownedUserIds, Sort.by(Sort.Direction.ASC, "createdAt"));
        return calculateLiveBalanceFromCollections(customer, milkEntries, invoices, payments);
    }

    private CustomerRecentSummary buildRecentSummary(Customer customer, List<com.dairy.backend.entity.MilkEntry> milkEntries) {
        Map<LocalDate, DailyEntryAggregate> entriesByDate = new HashMap<>();
        for (var entry : milkEntries) {
            if (!customer.getId().equals(entry.getCustomerId()) || entry.getDate() == null) {
                continue;
            }
            entriesByDate.computeIfAbsent(entry.getDate(), ignored -> new DailyEntryAggregate()).add(entry);
        }

        LocalDate latestEntryDate = entriesByDate.keySet().stream().max(LocalDate::compareTo).orElse(null);
        LocalDate latestSkippedDate = customer.getSkippedDates() != null && !customer.getSkippedDates().isEmpty()
                ? customer.getSkippedDates().stream().max(LocalDate::compareTo).orElse(null)
                : null;

        CustomerRecentSummary summary = new CustomerRecentSummary();
        if (latestSkippedDate != null && (latestEntryDate == null || !latestSkippedDate.isBefore(latestEntryDate))) {
            summary.date = latestSkippedDate;
            summary.skipped = true;
            return summary;
        }

        if (latestEntryDate != null) {
            DailyEntryAggregate aggregate = entriesByDate.get(latestEntryDate);
            summary.date = latestEntryDate;
            summary.quantity = aggregate != null ? aggregate.quantity : BigDecimal.ZERO;
            summary.amount = aggregate != null ? aggregate.amount : BigDecimal.ZERO;
        }

        return summary;
    }

    private CustomerDto mapToDto(Customer customer, BigDecimal balance, CustomerRecentSummary recentSummary) {
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
                .recentEntryDate(recentSummary != null ? recentSummary.date : null)
                .recentEntryQuantity(recentSummary != null ? recentSummary.quantity : BigDecimal.ZERO)
                .recentEntryAmount(recentSummary != null ? recentSummary.amount : BigDecimal.ZERO)
                .recentEntrySkipped(recentSummary != null && recentSummary.skipped)
                .build();
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
        Set<String> ownedUserIds = resolveOwnedUserIds(userId);
        List<Customer> customers = customerRepository.findByUserId(userId);
        LocalDate recentStart = java.time.LocalDate.now().minusDays(7);
        List<com.dairy.backend.entity.MilkEntry> recentEntries = milkEntryRepository.findByUserIdInAndDateBetween(
                ownedUserIds, recentStart, java.time.LocalDate.now().plusDays(1));

        return customers.stream()
                .map(customer -> mapToDto(
                        customer,
                        customer.getBalance() != null ? customer.getBalance() : BigDecimal.ZERO,
                        buildRecentSummary(customer, recentEntries)
                ))
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
        return mapToDto(customer, balance, null);
    }
}
