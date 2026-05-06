package com.dairy.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class InventoryItemDto {
    private String id;
    private String name;
    private String category;
    private BigDecimal quantity;
    private String unit;
}
