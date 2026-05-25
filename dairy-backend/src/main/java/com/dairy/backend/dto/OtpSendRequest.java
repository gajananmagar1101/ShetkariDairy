package com.dairy.backend.dto;

import lombok.Data;

@Data
public class OtpSendRequest {
    private String phone;
    private String channel;
}
