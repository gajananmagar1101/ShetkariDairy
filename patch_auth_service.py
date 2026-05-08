import os

def patch_auth_service(filepath, client_id):
    with open(filepath, 'r') as f:
        content = f.read()

    imports = """
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
"""
    content = content.replace("import java.util.List;", imports)

    google_login_method = f"""
    public AuthResponse googleLogin(Map<String, String> request) {{
        String token = request.get("token");
        try {{
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList("{client_id}"))
                .build();
                
            GoogleIdToken idToken = verifier.verify(token);
            if (idToken != null) {{
                GoogleIdToken.Payload payload = idToken.getPayload();
                String userId = payload.getSubject();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                Optional<User> userOptional = userRepository.findByGoogleId(userId);
                User user;
                if (userOptional.isPresent()) {{
                    user = userOptional.get();
                }} else {{
                    // Fallback to find by email if registered manually before
                    Optional<User> emailUser = userRepository.findByEmail(email);
                    if (emailUser.isPresent()) {{
                        user = emailUser.get();
                        user.setGoogleId(userId);
                        user.setPicture(pictureUrl);
                    }} else {{
                        user = User.builder()
                            .googleId(userId)
                            .email(email)
                            .name(name)
                            .picture(pictureUrl)
                            .role(Role.ADMIN)
                            .build();
                    }}
                    userRepository.save(user);
                }}

                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail() != null ? user.getEmail() : user.getPhone());
                String jwtToken = jwtService.generateToken(userDetails);

                return AuthResponse.builder()
                        .token(jwtToken)
                        .user(user)
                        .build();

            }} else {{
                throw new RuntimeException("Invalid ID token.");
            }}
        }} catch (Exception e) {{
            throw new RuntimeException("Google Authentication Failed: " + e.getMessage());
        }}
    }}
"""
    insert_idx = content.rfind("}")
    content = content[:insert_idx] + google_login_method + content[insert_idx:]

    with open(filepath, 'w') as f:
        f.write(content)

client_id = "554655172126-0imvqv0v7e00gi8rhmb3s3rhmlcmu4nb.apps.googleusercontent.com"
patch_auth_service("dairy-backend/src/main/java/com/dairy/backend/service/AuthService.java", client_id)
