package com.dairy.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoEntrySettingsDto {
    private String autoEntryTime;
    private String timezone;
    private String upiId;
}
