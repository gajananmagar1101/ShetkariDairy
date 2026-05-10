package com.dairy.backend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;

import com.dairy.backend.dto.AuthRequest;
import com.dairy.backend.dto.AuthResponse;
import com.dairy.backend.dto.RegisterRequest;
import com.dairy.backend.entity.User;
import com.dairy.backend.entity.Role;
import com.dairy.backend.repository.UserRepository;
import com.dairy.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new RuntimeException("Phone number already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getPhone());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role(user.getRole().name())
                .build();
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getPhone(), request.getPassword())
        );

        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getPhone());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .role(user.getRole().name())
                .build();
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
