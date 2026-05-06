package com.dairy.backend.dto;

import com.dairy.backend.entity.Role;
import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String phone;
    private String password;
    private Role role;
}
