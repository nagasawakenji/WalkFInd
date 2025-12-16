package nagasawakenji.walkfind.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
@Profile("local")
public class SecurityConfigLocal {

    @Bean
    public SecurityFilterChain securityFilterChainLocal(HttpSecurity http) throws Exception {

        http
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())

                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(bearerTokenResolver()) // ★追加（Cookie対応）
                        .jwt(Customizer.withDefaults())
                )

                .authorizeHttpRequests(auth -> auth

                        // /contests/** は公開だが、/contests/mine/** は管理者用なので先に認証必須とする
                        .requestMatchers(HttpMethod.GET, "/api/v1/contests/mine/**").authenticated()

                        // 管理者用APIは公開しない（admin判定はService層で行うため、ここでは最低限 authenticated）
                        .requestMatchers("/api/v1/admin/**").authenticated()

                        // ★ preflight は全許可
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 認証系は誰でもOK
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // ★★★ ここが最重要：/users/me は公開より先に認証必須にする
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()

                        // ===== 公開 GET API =====
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/photos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/contests/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/results/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/local-storage/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/contest-icons/**").permitAll()

                        // ===== 認証必須 API =====
                        .requestMatchers("/api/v1/profile/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/**").authenticated()

                        .anyRequest().permitAll()
                );

        return http.build();
    }

    /**
     * まず Authorization: Bearer を見て、無ければ Cookie(access_token) を見る
     */
    @Bean
    public BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return new BearerTokenResolver() {
            @Override
            public String resolve(HttpServletRequest request) {
                String fromHeader = headerResolver.resolve(request);
                if (StringUtils.hasText(fromHeader)) return fromHeader;

                Cookie[] cookies = request.getCookies();
                if (cookies == null) return null;
                for (Cookie c : cookies) {
                    if ("access_token".equals(c.getName()) && StringUtils.hasText(c.getValue())) {
                        return c.getValue();
                    }
                }
                return null;
            }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        // （必要なら）Set-Cookie をJSで読む必要は無いが、デバッグ用に残してもOK

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        String jwkSetUri = "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_EEmnkKMbG/.well-known/jwks.json";
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }
}