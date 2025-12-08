package nagasawakenji.walkfind.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("=== SecurityConfig.securityFilterChain for LAMBDA is being built ===");

        http
                // セッション管理をSTATELESSに設定
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // CSRFを無効化
                .csrf(AbstractHttpConfigurer::disable)

                // CORS設定の適用 (下のBeanを使います)
                .cors(Customizer.withDefaults())

                // JWTリソースサーバーの設定
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))

                // 認可規則（APIアクセス制御）
                .authorizeHttpRequests(auth -> auth
                        // ★修正: パスを /api/v1/auth/** に変更 (ログインURLに合わせる)
                        .requestMatchers("/api/v1/contests/**", "/api/v1/results/**", "/api/v1/auth/**").permitAll()

                        // 保護されたエンドポイント（認証必須）
                        .requestMatchers("/api/v1/photos/**", "/api/v1/votes/**", "/api/v1/users/**").authenticated()

                        // 上記以外のすべては認証を要求
                        .anyRequest().authenticated()
                );
        return http.build();
    }

    // CORS設定のBean
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 本番: Vercel とローカル開発の両方から叩けるように明示的に許可
        // ※ allowCredentials(true) と併用する場合、"*" よりも明示的なオリジン指定の方が安全かつ確実
        configuration.setAllowedOrigins(List.of(
                "https://walkfind.vercel.app",   // Vercel 本番フロント
                "http://localhost:3000"           // ローカル開発用フロント
        ));



        // すべてのHTTPメソッドを許可
        configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));

        // ★修正: ヘッダーはすべて許可しておくとトラブルが少ないです
        configuration.setAllowedHeaders(List.of("*"));

        // ★修正2: allowCredentialsを true に変更 (必須！)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("cognito:groups");
        converter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(converter);

        return jwtConverter;
    }
}