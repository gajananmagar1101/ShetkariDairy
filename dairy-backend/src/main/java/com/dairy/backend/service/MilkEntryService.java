package com.dairy.backend.service;

import com.dairy.backend.dto.MilkEntryDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MilkEntryService {

    private final MilkEntryRepository milkEntryRepository;
    private final CustomerRepository customerRepository;

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
        customerRepository.save(customer);

        return mapToDto(entry, customer.getName());
    }

    public List<MilkEntryDto> getEntriesByDate(LocalDate date) {
        return milkEntryRepository.findByDate(date).stream()
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

        return milkEntryRepository.findByCustomerIdAndDateBetween(customerId, startDate, endDate).stream()
                .map(entry -> mapToDto(entry, customerName))
                .collect(Collectors.toList());
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
        List<Customer> activeCustomers = customerRepository.findByIsActiveTrue();
        int generatedCount = 0;

        for (Customer customer : activeCustomers) {
            // Check if customer has a daily quantity plan
            if (customer.getDailyQuantity() != null && customer.getDailyQuantity().compareTo(BigDecimal.ZERO) > 0) {
                // Prevent duplicate entries for the same date
                if (!milkEntryRepository.existsByCustomerIdAndDate(customer.getId(), date)) {
                    BigDecimal mQty = customer.getDailyQuantity();
                    BigDecimal rate = customer.getRatePerLiter();
                    BigDecimal totalAmount = mQty.multiply(rate);

                    MilkEntry entry = MilkEntry.builder()
                            .customerId(customer.getId())
                            .date(date)
                            .morningQuantity(mQty)
                            .eveningQuantity(BigDecimal.ZERO)
                            .ratePerLiter(rate)
                            .totalAmount(totalAmount)
                            .build();

                    milkEntryRepository.save(entry);

                    // Update balance
                    customer.setBalance(customer.getBalance().add(totalAmount));
                    customerRepository.save(customer);

                    generatedCount++;
                }
            }
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
