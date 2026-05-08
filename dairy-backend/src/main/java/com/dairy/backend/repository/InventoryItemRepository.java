package com.dairy.backend.repository;

import com.dairy.backend.entity.InventoryItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventoryItemRepository extends MongoRepository<InventoryItem, String> {
    List<InventoryItem> findByUserId(String userId);
}
