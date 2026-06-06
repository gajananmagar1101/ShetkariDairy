package com.dairy.backend.listener;

import com.dairy.backend.event.MonthEndEntrySavedEvent;
import com.dairy.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.YearMonth;

@Component
@RequiredArgsConstructor
public class MonthEndInvoiceListener {

    private final InvoiceService invoiceService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleMonthEndEntry(MonthEndEntrySavedEvent event) {
        if (event == null || event.userId() == null || event.customerId() == null || event.entryDate() == null) {
            return;
        }

        YearMonth yearMonth = YearMonth.from(event.entryDate());
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        invoiceService.generateInvoiceForUser(event.userId(), event.customerId(), startDate, endDate);
    }
}
