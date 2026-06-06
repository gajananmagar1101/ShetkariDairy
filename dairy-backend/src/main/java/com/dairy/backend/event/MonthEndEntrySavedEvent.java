package com.dairy.backend.event;

import java.time.LocalDate;

public record MonthEndEntrySavedEvent(String userId, String customerId, LocalDate entryDate) {
}
