package com.dairy.backend.config;

import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class MilkEntryDeduplicator {

    private final MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void deduplicateOnStartup() {
        deduplicateMilkEntries();
        fixInvoicePeriodDates();
    }

    private void deduplicateMilkEntries() {
        try {
            List<MilkEntry> allEntries = mongoTemplate.findAll(MilkEntry.class);
            Map<String, List<MilkEntry>> grouped = new HashMap<>();

            for (MilkEntry entry : allEntries) {
                if (entry.getCustomerId() == null || entry.getDate() == null) continue;
                String key = entry.getCustomerId() + "|" + entry.getDate().toString();
                grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(entry);
            }

            int removedCount = 0;
            for (Map.Entry<String, List<MilkEntry>> group : grouped.entrySet()) {
                List<MilkEntry> entries = group.getValue();
                if (entries.size() <= 1) continue;

                entries.sort((a, b) -> {
                    LocalDateTime aTime = a.getUpdatedAt() != null ? a.getUpdatedAt() : (a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN);
                    LocalDateTime bTime = b.getUpdatedAt() != null ? b.getUpdatedAt() : (b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN);
                    return bTime.compareTo(aTime);
                });

                for (int i = 1; i < entries.size(); i++) {
                    mongoTemplate.remove(new Query(Criteria.where("_id").is(entries.get(i).getId())), MilkEntry.class);
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                log.info("Startup deduplication: removed {} duplicate milk entries", removedCount);
            } else {
                log.debug("Startup deduplication: no duplicates found");
            }
        } catch (Exception e) {
            log.warn("Startup deduplication skipped due to error: {}", e.getMessage());
        }
    }

    private void fixInvoicePeriodDates() {
        try {
            List<Invoice> allInvoices = mongoTemplate.findAll(Invoice.class);
            int fixedCount = 0;

            for (Invoice invoice : allInvoices) {
                if (invoice.getInvoiceMonth() == null || invoice.getInvoiceYear() == null) continue;

                YearMonth ym = YearMonth.of(invoice.getInvoiceYear(), invoice.getInvoiceMonth());
                LocalDate correctStart = ym.atDay(1);
                LocalDate correctEnd = ym.atEndOfMonth();

                boolean needsFix = false;
                if (invoice.getPeriodStartDate() == null || !invoice.getPeriodStartDate().equals(correctStart)) {
                    invoice.setPeriodStartDate(correctStart);
                    needsFix = true;
                }
                if (invoice.getPeriodEndDate() == null || !invoice.getPeriodEndDate().equals(correctEnd)) {
                    invoice.setPeriodEndDate(correctEnd);
                    needsFix = true;
                }

                if (needsFix) {
                    mongoTemplate.save(invoice);
                    fixedCount++;
                }
            }

            if (fixedCount > 0) {
                log.info("Startup invoice fix: corrected period dates on {} invoices", fixedCount);
            } else {
                log.debug("Startup invoice fix: all invoice periods are correct");
            }
        } catch (Exception e) {
            log.warn("Startup invoice period fix skipped due to error: {}", e.getMessage());
        }
    }
}
