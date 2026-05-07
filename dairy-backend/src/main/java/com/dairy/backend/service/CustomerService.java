package com.dairy.backend.service;

import com.dairy.backend.dto.CustomerDto;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.InvoiceRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final MilkEntryRepository milkEntryRepository;
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
                .isActive(true)
                .build();

        customer = customerRepository.save(customer);
        return mapToDto(customer);
    }

    public List<CustomerDto> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public void deleteCustomer(String id) {
        milkEntryRepository.deleteByCustomerId(id);
        invoiceRepository.deleteByCustomerId(id);
        paymentRepository.deleteByCustomerId(id);
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
        // Do not update balance or joinedDate during normal edit
        return mapToDto(customerRepository.save(customer));
    }

    private CustomerDto mapToDto(Customer customer) {
        return CustomerDto.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .balance(customer.getBalance())
                .milkType(customer.getMilkType())
                .ratePerLiter(customer.getRatePerLiter())
                .dailyQuantity(customer.getDailyQuantity())
                .autoEntryEnabled(customer.isAutoEntryEnabled())
                .defaultMorningQuantity(customer.getDefaultMorningQuantity())
                .defaultEveningQuantity(customer.getDefaultEveningQuantity())
                .active(customer.isActive())
                .build();
    }
}
