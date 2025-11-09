package nagasawakenji.WalkFind.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // 認証フィルター（カスタム実装が必要だが、ここではDIして組み込む）
    // Spring標準のOAuth2リソースサーバー機能を使うため、このフィルターは現在はコメントアウトして標準機能を使います。
    // private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // Spring Security 6以降の標準的な設定方法
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                // セッション管理をSTATELESSに設定
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // CSRFを無効化
                .csrf(AbstractHttpConfigurer::disable)

                // CORS設定の適用
                .cors(Customizer.withDefaults())

                // JWTリソースサーバーの設定
                // propertiesファイルで設定したCognito情報に基づき、JWTを自動検証します。
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))

                // 認可規則（APIアクセス制御）
                .authorizeHttpRequests(auth -> auth
                        // 公開エンドポイント（認証不要）
                        // コンテストリスト、結果表示、ヘルステスト
                        .requestMatchers("/api/v1/contests/**", "/api/v1/results/**", "/v1/auth/**").permitAll()

                        // 保護されたエンドポイント（認証必須）
                        // 投稿、投票、ユーザー情報更新など
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

        // 実際のドメインに後で変更する
        configuration.setAllowedOrigins(List.of("https://walkfind.com", "http://localhost:3000"));

        configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type")); // Authorizationは大文字で登録
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}