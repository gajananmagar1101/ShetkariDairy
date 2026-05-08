package com.dairy.backend.controller;

import com.dairy.backend.entity.User;
import com.dairy.backend.repository.UserRepository;
import com.dairy.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<User>> updateProfile(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByEmail(username)
                .orElseGet(() -> userRepository.findByPhone(username)
                        .orElseThrow(() -> new RuntimeException("User not found")));

        if (request.containsKey("name")) {
            user.setName(request.get("name"));
        }
        if (request.containsKey("phone")) {
            user.setPhone(request.get("phone"));
        }
        if (request.containsKey("picture")) {
            user.setPicture(request.get("picture"));
        }

        User updatedUser = userRepository.save(user);

        return ResponseEntity.ok(new ApiResponse<>(true, "Profile updated successfully", updatedUser));
    }
}
