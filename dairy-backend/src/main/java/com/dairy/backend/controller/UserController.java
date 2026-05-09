package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.AutoEntrySettingsDto;
import com.dairy.backend.dto.AutoEntrySettingsRequest;
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

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private static final String DEFAULT_AUTO_ENTRY_TIME = "21:30";
    private static final String AUTO_ENTRY_TIME_ZONE = "Asia/Kolkata";
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):([0-5]\\d)$");
    private static final Pattern UPI_PATTERN = Pattern.compile("^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$");

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
        String email = user.getEmail();
        boolean phoneChanged = false;

        if (request.containsKey("name")) {
            user.setName(request.get("name"));
        }
        if (request.containsKey("phone")) {
            String newPhone = request.get("phone");
            phoneChanged = newPhone != null && !newPhone.equals(oldPhone);
            user.setPhone(newPhone);
        }
        if (request.containsKey("picture")) {
            user.setPicture(request.get("picture"));
        }

        User updatedUser = userRepository.save(user);
        String token = null;

        if (phoneChanged && updatedUser.getPhone() != null && !updatedUser.getPhone().isBlank()) {
            Set<String> legacyUserIds = new LinkedHashSet<>();
            legacyUserIds.add(currentIdentifier);
            legacyUserIds.add(oldPhone);
            legacyUserIds.add(email);

            migrateUserDataOwnership(legacyUserIds, updatedUser.getPhone());
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

    @GetMapping("/auto-entry-settings")
    public ResponseEntity<ApiResponse<AutoEntrySettingsDto>> getAutoEntrySettings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = findCurrentUser(username);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Auto entry settings fetched successfully",
                AutoEntrySettingsDto.builder()
                        .autoEntryTime(resolveAutoEntryTime(user))
                        .timezone(AUTO_ENTRY_TIME_ZONE)
                        .upiId(resolveUpiId(user))
                        .build()
        ));
    }

    @PutMapping("/auto-entry-settings")
    public ResponseEntity<ApiResponse<AutoEntrySettingsDto>> updateAutoEntrySettings(@RequestBody AutoEntrySettingsRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = findCurrentUser(username);

        String normalizedTime = normalizeAutoEntryTime(request.getAutoEntryTime());
        String normalizedUpiId = normalizeUpiId(request.getUpiId());
        user.setAutoEntryTime(normalizedTime);
        user.setUpiId(normalizedUpiId);
        User updatedUser = userRepository.save(user);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "App settings updated successfully",
                AutoEntrySettingsDto.builder()
                        .autoEntryTime(resolveAutoEntryTime(updatedUser))
                        .timezone(AUTO_ENTRY_TIME_ZONE)
                        .upiId(resolveUpiId(updatedUser))
                        .build()
        ));
    }

    private User findCurrentUser(String identifier) {
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByPhone(identifier))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String resolveAutoEntryTime(User user) {
        if (user.getAutoEntryTime() == null || user.getAutoEntryTime().isBlank()) {
            return DEFAULT_AUTO_ENTRY_TIME;
        }
        return user.getAutoEntryTime();
    }

    private String normalizeAutoEntryTime(String autoEntryTime) {
        String normalized = autoEntryTime != null ? autoEntryTime.trim() : "";
        if (!TIME_PATTERN.matcher(normalized).matches()) {
            throw new RuntimeException("Auto entry time must be in HH:mm format");
        }
        return normalized;
    }

    private String resolveUpiId(User user) {
        return user.getUpiId() != null ? user.getUpiId() : "";
    }

    private String normalizeUpiId(String upiId) {
        String normalized = upiId != null ? upiId.trim() : "";
        if (normalized.isEmpty()) {
            return "";
        }
        if (!UPI_PATTERN.matcher(normalized).matches()) {
            throw new RuntimeException("UPI ID must look like name@bank");
        }
        return normalized;
    }

    private void migrateUserDataOwnership(Set<String> oldUserIds, String newUserId) {
        if (newUserId == null || newUserId.isBlank()) {
            return;
        }

        Set<String> validOldUserIds = oldUserIds.stream()
                .filter(id -> id != null && !id.isBlank() && !id.equals(newUserId))
                .collect(java.util.stream.Collectors.toSet());

        if (validOldUserIds.isEmpty()) {
            return;
        }

        Query query = Query.query(Criteria.where("userId").in(validOldUserIds));
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
