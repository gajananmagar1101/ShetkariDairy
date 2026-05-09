package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.AuthResponse;
import com.dairy.backend.entity.Attendance;
import com.dairy.backend.entity.Customer;
import com.dairy.backend.entity.DeliveryOverride;
import com.dairy.backend.entity.Expense;
import com.dairy.backend.entity.InventoryItem;
import com.dairy.backend.entity.Invoice;
import com.dairy.backend.entity.MilkEntry;
import com.dairy.backend.entity.Payment;
import com.dairy.backend.entity.Report;
import com.dairy.backend.entity.SpecialCondition;
import com.dairy.backend.entity.User;
import com.dairy.backend.entity.Worker;
import com.dairy.backend.repository.UserRepository;
import com.dairy.backend.security.CustomUserDetailsService;
import com.dairy.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final MongoTemplate mongoTemplate;

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<AuthResponse>> updateProfile(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentIdentifier = authentication.getName();

        User user = findCurrentUser(currentIdentifier);
        String oldPhone = user.getPhone();
        boolean shouldRotatePhoneIdentity = false;

        if (request.containsKey("name")) {
            user.setName(request.get("name"));
        }
        if (request.containsKey("phone")) {
            String newPhone = request.get("phone");
            shouldRotatePhoneIdentity = oldPhone != null
                    && !oldPhone.equals(newPhone)
                    && oldPhone.equals(currentIdentifier);
            user.setPhone(newPhone);
        }
        if (request.containsKey("picture")) {
            user.setPicture(request.get("picture"));
        }

        User updatedUser = userRepository.save(user);
        String token = null;

        if (shouldRotatePhoneIdentity) {
            migrateUserDataOwnership(currentIdentifier, updatedUser.getPhone());
            UserDetails userDetails = userDetailsService.loadUserByUsername(updatedUser.getPhone());
            token = jwtUtil.generateToken(userDetails);
        }

        AuthResponse response = AuthResponse.builder()
                .token(token)
                .name(updatedUser.getName())
                .role(updatedUser.getRole() != null ? updatedUser.getRole().name() : null)
                .picture(updatedUser.getPicture())
                .email(updatedUser.getEmail())
                .phone(updatedUser.getPhone())
                .build();

        return ResponseEntity.ok(new ApiResponse<>(true, "Profile updated successfully", response));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<User>> getProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = findCurrentUser(username);

        return ResponseEntity.ok(new ApiResponse<>(true, "Profile fetched successfully", user));
    }

    private User findCurrentUser(String identifier) {
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByPhone(identifier))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void migrateUserDataOwnership(String oldUserId, String newUserId) {
        if (oldUserId == null || newUserId == null || oldUserId.equals(newUserId)) {
            return;
        }

        Query query = Query.query(Criteria.where("userId").is(oldUserId));
        Update update = new Update().set("userId", newUserId);

        mongoTemplate.updateMulti(query, update, Customer.class);
        mongoTemplate.updateMulti(query, update, MilkEntry.class);
        mongoTemplate.updateMulti(query, update, Invoice.class);
        mongoTemplate.updateMulti(query, update, Payment.class);
        mongoTemplate.updateMulti(query, update, InventoryItem.class);
        mongoTemplate.updateMulti(query, update, Expense.class);
        mongoTemplate.updateMulti(query, update, Worker.class);
        mongoTemplate.updateMulti(query, update, Report.class);
        mongoTemplate.updateMulti(query, update, Attendance.class);
        mongoTemplate.updateMulti(query, update, SpecialCondition.class);
        mongoTemplate.updateMulti(query, update, DeliveryOverride.class);
    }
}
