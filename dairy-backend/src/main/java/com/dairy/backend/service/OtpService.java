package com.dairy.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private record OtpEntry(String code, Instant expiresAt, String channel) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final RestClient restClient = RestClient.builder().build();

    @Value("${app.otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${app.otp.provider:twilio}")
    private String provider;

    @Value("${app.otp.twilio.account-sid:}")
    private String accountSid;

    @Value("${app.otp.twilio.auth-token:}")
    private String authToken;

    @Value("${app.otp.twilio.sms-from:}")
    private String smsFrom;

    @Value("${app.otp.twilio.whatsapp-from:}")
    private String whatsappFrom;

    public void sendOtp(String phone, String channel) {
        String normalizedChannel = normalizeChannel(channel);
        String normalizedPhone = normalizePhone(phone);
        String otp = generateOtp();
        otpStore.put(normalizedPhone, new OtpEntry(otp, Instant.now().plus(Duration.ofMinutes(expiryMinutes)), normalizedChannel));

        if (!"twilio".equalsIgnoreCase(provider)) {
            throw new IllegalStateException("Unsupported OTP provider configured: " + provider);
        }

        String from = "whatsapp".equals(normalizedChannel) ? whatsappFrom : smsFrom;
        String to = "whatsapp".equals(normalizedChannel) ? "whatsapp:" + normalizedPhone : normalizedPhone;

        if (from == null || from.isBlank()) {
            throw new IllegalStateException("OTP sender is not configured for " + normalizedChannel + ". Set the matching Twilio sender environment variable.");
        }
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            throw new IllegalStateException("Twilio OTP credentials are missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("From", from);
        form.add("To", to);
        form.add("Body", "Your Shetkari Vahi OTP is " + otp + ". It expires in " + expiryMinutes + " minutes.");

        String basicAuth = Base64.getEncoder()
                .encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

        restClient.post()
                .uri("https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json", accountSid)
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basicAuth)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toBodilessEntity();
    }

    public void verifyOtp(String phone, String otp) {
        OtpEntry otpEntry = otpStore.get(phone);
        if (otpEntry == null) {
            throw new IllegalArgumentException("OTP not found. Please request a new OTP.");
        }
        if (Instant.now().isAfter(otpEntry.expiresAt())) {
            otpStore.remove(phone);
            throw new IllegalArgumentException("OTP expired. Please request a new OTP.");
        }
        if (!otpEntry.code().equals(otp)) {
            throw new IllegalArgumentException("Invalid OTP. Please try again.");
        }

        otpStore.remove(phone);
    }

    private String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    private String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) {
            return "sms";
        }

        String normalized = channel.trim().toLowerCase();
        if (!normalized.equals("sms") && !normalized.equals("whatsapp")) {
            throw new IllegalArgumentException("Unsupported OTP channel. Use sms or whatsapp.");
        }
        return normalized;
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("Phone number is required.");
        }

        String digits = phone.replaceAll("[^\\d+]", "");
        if (digits.startsWith("+")) {
            return digits;
        }
        if (digits.length() == 10) {
            return "+91" + digits;
        }
        if (digits.length() == 12 && digits.startsWith("91")) {
            return "+" + digits;
        }
        throw new IllegalArgumentException("Enter a valid mobile number with country code, for example +919876543210.");
    }
}
