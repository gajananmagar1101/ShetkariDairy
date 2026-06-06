package com.dairy.backend.dto;

import lombok.Data;

@Data
public class OtpVerifyRequest {
    private String phone;
    private String otp;
    private String name;
}
