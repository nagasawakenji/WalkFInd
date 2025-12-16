package nagasawakenji.walkfind.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod; // 追加
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
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
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)

                // 1. ここでcorsConfigurationSource Beanが自動的に適用されます
                .cors(Customizer.withDefaults())

                .oauth2ResourceServer(oauth2 -> oauth2
                                .bearerTokenResolver(bearerTokenResolver())
                                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        )
                .authorizeHttpRequests(auth -> auth
                        // ★【最重要】OPTIONSメソッド（Preflight）を無条件で全許可する
                        // これがないとブラウザの事前確認が403/401ではじかれます
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/v1/auth/me").authenticated()

                        // /users/me はemailなどが記載されるため、認証が必要
                        .requestMatchers("/api/v1/users/me").authenticated()
                        // /users/id は公開情報のため認証は不要
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/**").permitAll()

                        // /contests/** は公開だが、/contests/mine/** は自分専用なので認証必須（先に定義する）
                        .requestMatchers(HttpMethod.GET, "/api/v1/contests/mine/**").authenticated()

                        // 管理者用API（admin判定はService層で行うため、ここでは最低限 authenticated）
                        .requestMatchers("/api/v1/admin/**").authenticated()

                        // 認証不要なエンドポイント
                        .requestMatchers("/api/v1/contests/**", "/api/v1/results/**", "/api/v1/auth/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/v1/contest-icons/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/upload/presigned-url").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/upload/presigned-download-url").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/upload/**").authenticated() // Presigned URL発行は認証必須

                        // それ以外は認証必須
                        .anyRequest().authenticated()
                );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 許可するオリジン（末尾にスラッシュを入れないよう注意）
        configuration.setAllowedOrigins(List.of(
                "https://walkfind.vercel.app",
                "http://localhost:3000"
        ));

        // メソッド許可
        configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));

        // ヘッダー許可
        configuration.setAllowedHeaders(List.of("*"));

        // 公開ヘッダー設定 (フロントエンドがAuthorizationヘッダー等を読み取れるようにする場合)
        configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));

        // Cookieや認証情報を含むリクエストを許可
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

    /**
     * HttpCookie から access_token を取り出すためのリゾルバー
     */
    @Bean
    public BearerTokenResolver bearerTokenResolver() {
        return new BearerTokenResolver() {
            @Override
            public String resolve(HttpServletRequest request) {
                Cookie[] cookies = request.getCookies();
                if (cookies == null) return null;

                for (Cookie c: cookies) {
                    if ("access_token".equals(c.getName()) && StringUtils.hasText(c.getValue())) {
                        return c.getValue();
                    }
                }

                return null;
            }
        };
    }
}