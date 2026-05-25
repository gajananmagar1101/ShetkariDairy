package com.dairy.backend.controller;

import com.dairy.backend.dto.ApiResponse;
import com.dairy.backend.dto.AuthRequest;
import com.dairy.backend.dto.AuthResponse;
import com.dairy.backend.dto.OtpSendRequest;
import com.dairy.backend.dto.OtpVerifyRequest;
import com.dairy.backend.dto.RegisterRequest;
import com.dairy.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Registration successful", authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", authService.login(request)));
    }

    @PostMapping("/mobile")
    public ResponseEntity<ApiResponse<AuthResponse>> mobileLogin(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Mobile login successful", authService.mobileLogin(request)));
    }

    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@RequestBody OtpSendRequest request) {
        authService.sendOtp(request.getPhone(), request.getChannel());
        return ResponseEntity.ok(new ApiResponse<>(true, "OTP sent successfully", null));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "OTP verified successfully",
                authService.verifyOtpAndLogin(request.getPhone(), request.getOtp(), request.getName())
        ));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(@RequestBody java.util.Map<String, String> request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Google Login successful", authService.googleLogin(request)));
    }
}
