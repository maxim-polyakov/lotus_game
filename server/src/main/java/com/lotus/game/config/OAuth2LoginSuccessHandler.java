package com.lotus.game.config;

import com.lotus.game.entity.User;
import com.lotus.game.repository.UserRepository;
import com.lotus.game.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import org.springframework.dao.DataIntegrityViolationException;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final OAuthCodeStore oauthCodeStore;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            Map<String, Object> attrs = oauth2User.getAttributes();

            String googleId = (String) attrs.get("sub");
            String email = (String) attrs.get("email");
            String name = (String) attrs.get("name");
            String picture = (String) attrs.get("picture");

            if (googleId == null || email == null) {
                log.warn("Google OAuth2: missing sub or email in attributes");
                redirectToFrontendWithError(response, "OAUTH_MISSING_DATA");
                return;
            }

            User user = userRepository.findByGoogleId(googleId)
                    .or(() -> userRepository.findByEmail(email))
                    .or(() -> userRepository.findByEmailIgnoreCase(email))
                    .orElseGet(() -> createGoogleUser(googleId, email, name, picture));

            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                user.setEmailVerified(true);
                if (picture != null) user.setAvatarUrl(picture);
                userRepository.save(user);
            }

            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            String accessToken = jwtService.buildAccessToken(user);
            String refreshToken = jwtService.buildRefreshToken(user);
            long expiresIn = jwtService.getAccessTokenExpirationSeconds();

            String code = oauthCodeStore.put(accessToken, refreshToken, expiresIn);
            log.info("Google OAuth2: success for user {} ({}), code stored, redirecting to frontend", user.getUsername(), email);

            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                    .queryParam("oauth", "google")
                    .queryParam("code", code)
                    .build().toUriString();

            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } catch (Exception e) {
            log.error("Google OAuth2: error during authentication success: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
            redirectToFrontendWithError(response, "OAUTH_AUTH_ERROR");
        }
    }

    private User createGoogleUser(String googleId, String email, String name, String picture) {
        try {
            String baseName = (name != null && !name.isBlank()) ? name : email.split("@")[0];
            String username = makeUniqueUsername(baseName);
            User user = User.builder()
                    .username(username)
                    .email(email)
                    .passwordHash(null)
                    .googleId(googleId)
                    .emailVerified(true)
                    .avatarUrl(picture)
                    .build();
            return userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            log.warn("Google OAuth2: create failed (likely duplicate email), retrying findByEmailIgnoreCase: {}", e.getMessage());
            return userRepository.findByEmailIgnoreCase(email)
                    .map(u -> {
                        u.setGoogleId(googleId);
                        u.setEmailVerified(true);
                        if (picture != null) u.setAvatarUrl(picture);
                        return userRepository.save(u);
                    })
                    .orElseThrow(() -> e);
        }
    }

    private String makeUniqueUsername(String base) {
        String candidate = base.replaceAll("\\s+", " ").replaceAll("[^a-zA-Z0-9_\\p{L}\\s]", "").trim();
        if (candidate.isEmpty() || candidate.length() < 2) candidate = "user";
        if (candidate.length() > 45) candidate = candidate.substring(0, 45);
        String username = candidate;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = candidate + " " + suffix++;
            if (username.length() > 50) username = "user " + UUID.randomUUID().toString().substring(0, 8);
        }
        return username;
    }

    private void redirectToFrontendWithError(HttpServletResponse response, String error) throws IOException {
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("oauth_error", error)
                .build().toUriString();
        response.sendRedirect(redirectUrl);
    }
}
