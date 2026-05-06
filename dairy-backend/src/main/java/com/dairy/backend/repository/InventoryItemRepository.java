package com.dairy.backend.repository;

import com.dairy.backend.entity.InventoryItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryItemRepository extends MongoRepository<InventoryItem, String> {
}
