package com.dairy.backend.dto;

import lombok.Data;

@Data
public class AutoEntrySettingsRequest {
    private String autoEntryTime;
    private String upiId;
}
