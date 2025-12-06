package nagasawakenji.walkfind.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.http.HttpMethod;

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

                // ★ JWT 認証を有効化（これが無いと必ず anonymousUser になる）
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))

                .authorizeHttpRequests(auth -> auth
                        // 認証系は誰でもOK
                        .requestMatchers("/api/auth/**").permitAll()

                        // コンテスト作成を許可
                        .requestMatchers(HttpMethod.POST, "/api/v1/contests").permitAll()

                        // アイコン投稿を許可
                        .requestMatchers(HttpMethod.POST, "/api/v1/contest-icons/**").permitAll()
                        // アイコン取得も許可
                        .requestMatchers(HttpMethod.GET, "/api/v1/contest-icons").permitAll()


                        // ===== 公開 GET API =====
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/photos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/contests/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/results/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/local-storage/**").permitAll()

                        // ===== 認証必須 API =====
                        .requestMatchers(HttpMethod.POST, "/api/v1/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/**").authenticated()

                        // その他
                        .anyRequest().permitAll()

                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // ローカル開発用: 署名検証をする場合は Cognito の jwk-set-uri を指定してください
        // 例: https://cognito-idp.ap-northeast-1.amazonaws.com/<POOL_ID>/.well-known/jwks.json
        String jwkSetUri = "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_EEmnkKMbG/.well-known/jwks.json";
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }
}