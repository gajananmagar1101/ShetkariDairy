package com.dairy.backend.security;

import com.dairy.backend.entity.User;
import com.dairy.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    private record CachedEntry(UserDetails userDetails, long expiresAt) {}
    private final Map<String, CachedEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        CachedEntry cached = cache.get(username);
        if (cached != null && cached.expiresAt > System.currentTimeMillis()) {
            return cached.userDetails;
        }

        User user = userRepository.findByPhone(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)));

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getPhone() != null ? user.getPhone() : user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "",
                Collections.singleton(new SimpleGrantedAuthority(user.getRole().name()))
        );

        cache.put(username, new CachedEntry(userDetails, System.currentTimeMillis() + CACHE_TTL_MS));
        return userDetails;
    }
}
