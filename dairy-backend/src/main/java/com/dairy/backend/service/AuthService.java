package com.dairy.backend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;

import com.dairy.backend.dto.AuthRequest;
import com.dairy.backend.dto.AuthResponse;
import com.dairy.backend.dto.RegisterRequest;
import com.dairy.backend.entity.Role;
import com.dairy.backend.entity.User;
import com.dairy.backend.repository.UserRepository;
import com.dairy.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String GOOGLE_CLIENT_ID = "554655172126-0imvqv0v7e00gi8rhmb3s3rhmlcmu4nb.apps.googleusercontent.com";
    private static final NetHttpTransport GOOGLE_HTTP_TRANSPORT = new NetHttpTransport();
    private static final GsonFactory GOOGLE_JSON_FACTORY = new GsonFactory();
    private static final GoogleIdTokenVerifier GOOGLE_ID_TOKEN_VERIFIER =
            new GoogleIdTokenVerifier.Builder(GOOGLE_HTTP_TRANSPORT, GOOGLE_JSON_FACTORY)
                    .setAudience(Collections.singletonList(GOOGLE_CLIENT_ID))
                    .build();

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final OtpService otpService;

    public AuthResponse register(RegisterRequest request) {
        return authenticateByPhone(request.getPhone(), request.getName(), request.getRole());
    }

    public AuthResponse login(AuthRequest request) {
        return authenticateByPhone(request.getPhone(), request.getName(), Role.ROLE_ADMIN);
    }

    public AuthResponse mobileLogin(AuthRequest request) {
        return authenticateByPhone(request.getPhone(), request.getName(), Role.ROLE_ADMIN);
    }

    public void sendOtp(String phone, String channel) {
        otpService.sendOtp(normalizePhone(phone), channel);
    }

    public AuthResponse verifyOtpAndLogin(String phone, String otp, String name) {
        String normalizedPhone = normalizePhone(phone);
        otpService.verifyOtp(normalizedPhone, otp);
        return authenticateByPhone(normalizedPhone, name, Role.ROLE_ADMIN);
    }

    private AuthResponse authenticateByPhone(String phone, String name, Role requestedRole) {
        String normalizedPhone = normalizePhone(phone);

        User user = userRepository.findByPhone(normalizedPhone)
                .map(existingUser -> updateMissingProfile(existingUser, name))
                .orElseGet(() -> userRepository.save(User.builder()
                        .name(resolveDisplayName(name, normalizedPhone))
                        .phone(normalizedPhone)
                        .role(requestedRole != null ? requestedRole : Role.ROLE_ADMIN)
                        .build()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(normalizedPhone);
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role(user.getRole().name())
                .phone(user.getPhone())
                .email(user.getEmail())
                .picture(user.getPicture())
                .build();
    }

    private User updateMissingProfile(User user, String name) {
        if ((user.getName() == null || user.getName().isBlank()) && name != null && !name.isBlank()) {
            user.setName(name.trim());
            return userRepository.save(user);
        }
        return user;
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new RuntimeException("Phone number is required");
        }

        String normalizedPhone = phone.replaceAll("\\s+", "").trim();
        if (normalizedPhone.isBlank()) {
            throw new RuntimeException("Phone number is required");
        }
        return normalizedPhone;
    }

    private String resolveDisplayName(String name, String phone) {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        return "User " + phone.substring(Math.max(0, phone.length() - 4));
    }

    public AuthResponse googleLogin(java.util.Map<String, String> request) {
        String token = request.get("token");
        try {
            GoogleIdToken idToken = GOOGLE_ID_TOKEN_VERIFIER.verify(token);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String userId = payload.getSubject();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                Optional<User> userOptional = userRepository.findByGoogleId(userId);
                User user;
                if (userOptional.isPresent()) {
                    user = userOptional.get();
                    boolean shouldSave = false;

                    if ((user.getPicture() == null || user.getPicture().startsWith("http"))
                            && pictureUrl != null
                            && !pictureUrl.equals(user.getPicture())) {
                        user.setPicture(pictureUrl);
                        shouldSave = true;
                    }
                    if ((user.getName() == null || user.getName().trim().isEmpty()) && name != null && !name.isBlank()) {
                        user.setName(name);
                        shouldSave = true;
                    }
                    if (shouldSave) {
                        userRepository.save(user);
                    }
                } else {
                    // Fallback to find by email if registered manually before
                    Optional<User> emailUser = userRepository.findByEmail(email);
                    if (emailUser.isPresent()) {
                        user = emailUser.get();
                        boolean shouldSave = false;

                        user.setGoogleId(userId);
                        shouldSave = true;
                        if ((user.getPicture() == null || user.getPicture().startsWith("http"))
                                && pictureUrl != null
                                && !pictureUrl.equals(user.getPicture())) {
                            user.setPicture(pictureUrl);
                            shouldSave = true;
                        }
                        if ((user.getName() == null || user.getName().trim().isEmpty()) && name != null && !name.isBlank()) {
                            user.setName(name);
                            shouldSave = true;
                        }
                        if (shouldSave) {
                            userRepository.save(user);
                        }
                    } else {
                        user = User.builder()
                            .googleId(userId)
                            .email(email)
                            .name(name)
                            .picture(pictureUrl)
                            .role(Role.ROLE_ADMIN)
                            .build();
                    }
                    userRepository.save(user);
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail() != null ? user.getEmail() : user.getPhone());
                String jwtToken = jwtUtil.generateToken(userDetails);

                return AuthResponse.builder()
                        .token(jwtToken)
                        .name(user.getName())
                        .role(user.getRole() != null ? user.getRole().name() : "ADMIN")
                        .picture(user.getPicture())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .build();

            } else {
                throw new RuntimeException("Invalid ID token.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Google Authentication Failed: " + e.getMessage());
        }
    }
}
