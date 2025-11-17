package nagasawakenji.walkfind.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

import javax.sql.DataSource;

@Configuration
@Slf4j
public class DataSourceConfig {

    private static final Region REGION = Region.AP_NORTHEAST_1;
    private static final String SECRET_ARN = System.getenv("DB_SECRET_ARN");

    @Bean
    public DataSource dataSource() {

        // Local environment
        if (System.getenv("AWS_LAMBDA_FUNCTION_NAME") == null) {
            log.warn("ローカル環境 -> Docker PostgreSQL を利用します。");
            return DataSourceBuilder.create()
                    .driverClassName("org.postgresql.Driver")
                    .url("jdbc:postgresql://localhost:5432/postgres")
                    .username("postgres")
                    .password("walkfind")
                    .build();
        }

        log.info("Lambda 環境 -> Secrets Manager より Supabase DB 情報を取得します");
        log.info("Using secret ARN: {}", SECRET_ARN);

        try (SecretsManagerClient client =
                     SecretsManagerClient.builder().region(REGION).build()) {

            String json = client.getSecretValue(
                    GetSecretValueRequest.builder()
                            .secretId(SECRET_ARN)
                            .build()
            ).secretString();

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(json);

            String host = root.get("host").asText();
            String port = root.get("port").asText();
            String dbname = root.get("dbname").asText();
            String username = root.get("username").asText();
            String password = root.get("password").asText();

            String url = String.format(
                    "jdbc:postgresql://%s:%s/%s?sslmode=require",
                    host, port, dbname
            );

            log.info("Supabase 接続成功 host={}", host);

            return DataSourceBuilder.create()
                    .driverClassName("org.postgresql.Driver")
                    .url(url)
                    .username(username)
                    .password(password)
                    .build();

        } catch (Exception e) {
            log.error("Secrets Manager からの DB 情報取得に失敗", e);
            throw new RuntimeException("データベース接続設定に失敗しました。", e);
        }
    }
}