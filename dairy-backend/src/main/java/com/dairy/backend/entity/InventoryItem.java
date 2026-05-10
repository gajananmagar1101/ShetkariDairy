package com.dairy.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "inventory")
@CompoundIndexes({
    @CompoundIndex(name = "inventory_user_created_idx", def = "{'userId': 1, 'createdAt': -1}"),
    @CompoundIndex(name = "inventory_user_category_idx", def = "{'userId': 1, 'category': 1}")
})
public class InventoryItem {
    @Indexed
    private String userId;

    @Id
    private String id;
    private String name;
    private String category; // FEED, MEDICINE, CANS
    private BigDecimal quantity;
    private String unit; // KG, PIECE, LITER

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
