package com.dairy.backend.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String phone;
    private String name;
}
