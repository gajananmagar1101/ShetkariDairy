package com.dairy.backend.service;

import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.repository.CustomerRepository;
import com.dairy.backend.repository.MilkEntryRepository;
import com.dairy.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MilkEntryServiceRangeGenerationTest {

    private static final String USER_ID = "default-user-id";
    private static final String CUSTOMER_ID = "customer-1";

    @Mock
    private MilkEntryRepository milkEntryRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MilkEntryService milkEntryService;

    @Test
    void autoGenerateEntriesForRange_skipsExistingDaysAndGeneratesMissingDays() {
        LocalDate existingDate = LocalDate.of(2026, 5, 24);
        LocalDate generatedDate = LocalDate.of(2026, 5, 25);

        Customer customer = buildAutoEntryCustomer();
        stubCommonRepositories(customer);
        when(milkEntryRepository.existsByUserIdInAndCustomerIdAndDate(anyCollection(), eq(CUSTOMER_ID), any(LocalDate.class)))
                .thenAnswer(invocation -> existingDate.equals(invocation.getArgument(2, LocalDate.class)));
        when(milkEntryRepository.save(any(MilkEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int generatedCount = milkEntryService.autoGenerateEntriesForRange(existingDate, generatedDate);

        assertEquals(1, generatedCount);

        ArgumentCaptor<MilkEntry> entryCaptor = ArgumentCaptor.forClass(MilkEntry.class);
        verify(milkEntryRepository).save(entryCaptor.capture());
        assertEquals(USER_ID, entryCaptor.getValue().getUserId());
        assertEquals(generatedDate, entryCaptor.getValue().getDate());
        assertEquals(0, BigDecimal.ZERO.compareTo(entryCaptor.getValue().getMorningQuantity()));
        assertEquals(0, BigDecimal.ONE.compareTo(entryCaptor.getValue().getEveningQuantity()));
        assertEquals(0, new BigDecimal("70").compareTo(entryCaptor.getValue().getTotalAmount()));

        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(customerCaptor.capture());
        assertEquals(0, new BigDecimal("70").compareTo(customerCaptor.getValue().getBalance()));
    }

    @Test
    void autoGenerateEntriesForRange_returnsZeroWhenEveryDateAlreadyExists() {
        LocalDate firstDate = LocalDate.of(2026, 5, 24);
        LocalDate secondDate = LocalDate.of(2026, 5, 25);

        Customer customer = buildAutoEntryCustomer();
        stubCommonRepositories(customer);
        when(milkEntryRepository.existsByUserIdInAndCustomerIdAndDate(anyCollection(), eq(CUSTOMER_ID), any(LocalDate.class)))
                .thenReturn(true);

        int generatedCount = milkEntryService.autoGenerateEntriesForRange(firstDate, secondDate);

        assertEquals(0, generatedCount);
        verify(milkEntryRepository, never()).save(any(MilkEntry.class));
        verify(customerRepository, never()).save(any(Customer.class));
    }

    @Test
    void getEntriesByDate_resolvesEntriesAcrossLinkedUserAliases() {
        LocalDate queryDate = LocalDate.of(2026, 5, 31);
        String alias = "9876543210";
        String canonicalUserId = "user-1";

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(alias, "token", List.of())
        );

        try {
            Customer customer = Customer.builder()
                    .id(CUSTOMER_ID)
                    .name("Test Customer")
                    .build();
            MilkEntry entry = MilkEntry.builder()
                    .id("entry-1")
                    .userId(canonicalUserId)
                    .customerId(CUSTOMER_ID)
                    .date(queryDate)
                    .morningQuantity(BigDecimal.ZERO)
                    .eveningQuantity(BigDecimal.ONE)
                    .ratePerLiter(new BigDecimal("70"))
                    .totalAmount(new BigDecimal("70"))
                    .build();

            when(userRepository.findById(alias)).thenReturn(Optional.empty());
            when(userRepository.findByEmail(alias)).thenReturn(Optional.empty());
            when(userRepository.findByPhone(alias)).thenReturn(Optional.of(
                    com.dairy.backend.entity.User.builder()
                            .id(canonicalUserId)
                            .phone(alias)
                            .email("alias@example.com")
                            .build()
            ));
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(milkEntryRepository.findByUserIdInAndDate(anyCollection(), eq(queryDate))).thenReturn(List.of(entry));

            var results = milkEntryService.getEntriesByDate(queryDate);

            assertEquals(1, results.size());
            assertEquals(queryDate, results.get(0).getDate());
            assertEquals(CUSTOMER_ID, results.get(0).getCustomerId());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void findEntriesByCustomerAndDateRange_includesBoundaryDates() {
        LocalDate startDate = LocalDate.of(2026, 5, 1);
        LocalDate endDate = LocalDate.of(2026, 5, 31);
        String alias = "9876543210";
        String canonicalUserId = "user-1";

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(alias, "token", List.of())
        );

        try {
            Customer customer = Customer.builder()
                    .id(CUSTOMER_ID)
                    .name("Test Customer")
                    .build();

            MilkEntry firstDay = MilkEntry.builder()
                    .id("entry-1")
                    .userId(canonicalUserId)
                    .customerId(CUSTOMER_ID)
                    .date(startDate)
                    .morningQuantity(BigDecimal.ZERO)
                    .eveningQuantity(BigDecimal.ONE)
                    .ratePerLiter(new BigDecimal("70"))
                    .totalAmount(new BigDecimal("70"))
                    .build();

            MilkEntry lastDay = MilkEntry.builder()
                    .id("entry-2")
                    .userId(canonicalUserId)
                    .customerId(CUSTOMER_ID)
                    .date(endDate)
                    .morningQuantity(BigDecimal.ZERO)
                    .eveningQuantity(BigDecimal.ONE)
                    .ratePerLiter(new BigDecimal("70"))
                    .totalAmount(new BigDecimal("70"))
                    .build();

            MilkEntry outsideRange = MilkEntry.builder()
                    .id("entry-3")
                    .userId(canonicalUserId)
                    .customerId(CUSTOMER_ID)
                    .date(startDate.minusDays(1))
                    .morningQuantity(BigDecimal.ZERO)
                    .eveningQuantity(BigDecimal.ONE)
                    .ratePerLiter(new BigDecimal("70"))
                    .totalAmount(new BigDecimal("70"))
                    .build();

            when(userRepository.findById(alias)).thenReturn(Optional.empty());
            when(userRepository.findByEmail(alias)).thenReturn(Optional.empty());
            when(userRepository.findByPhone(alias)).thenReturn(Optional.of(
                    com.dairy.backend.entity.User.builder()
                            .id(canonicalUserId)
                            .phone(alias)
                            .email("alias@example.com")
                            .build()
            ));
            when(milkEntryRepository.findByUserIdInAndDateBetween(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(outsideRange, firstDay, lastDay));

            var results = milkEntryService.findEntriesByCustomerAndDateRange(alias, CUSTOMER_ID, startDate, endDate);

            assertEquals(2, results.size());
            assertEquals(startDate, results.get(0).getDate());
            assertEquals(endDate, results.get(1).getDate());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void stubCommonRepositories(Customer customer) {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(USER_ID)).thenReturn(Optional.empty());
        when(userRepository.findByPhone(USER_ID)).thenReturn(Optional.empty());
        when(customerRepository.findByUserIdAndIsActiveTrue(USER_ID)).thenReturn(List.of(customer));
    }

    private Customer buildAutoEntryCustomer() {
        return Customer.builder()
                .id(CUSTOMER_ID)
                .userId(USER_ID)
                .name("Test Customer")
                .balance(BigDecimal.ZERO)
                .ratePerLiter(new BigDecimal("70"))
                .defaultMorningQuantity(BigDecimal.ZERO)
                .defaultEveningQuantity(BigDecimal.ONE)
                .autoEntryEnabled(true)
                .isActive(true)
                .build();
    }
}
