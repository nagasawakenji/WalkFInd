package nagasawakenji.walkfind.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import javax.sql.DataSource;

@Configuration
@Slf4j
public class DataSourceConfig {

    // application.propertiesで設定したシークレットのARNを取得
    @Value("${db.secret.arn}")
    private String secretArn;

    // AWSリージョンをap-northeast-1に固定
    private static final String AWS_REGION = "ap-northeast-1";

    /**
     * アプリケーションで使用されるカスタムDataSource Beanを定義します。
     * 実行環境に応じてSecrets ManagerまたはローカルDockerの設定を適用します。
     */
    @Bean
    public DataSource dataSource() {
        // --- ローカル開発環境のチェック ---
        // AWS_LAMBDA_FUNCTION_NAME環境変数がない場合、ローカルDocker設定を返す
        if (System.getenv("AWS_LAMBDA_FUNCTION_NAME") == null) {
            log.warn("ローカルで実行中です。Docker PostgreSQL設定を使用します。");
            DriverManagerDataSource dataSource = new DriverManagerDataSource();
            // Docker接続情報 (以前設定した値)
            dataSource.setDriverClassName("org.postgresql.Driver");
            dataSource.setUrl("jdbc:postgresql://localhost:5432/postgres");
            dataSource.setUsername("postgres");
            dataSource.setPassword("walkfind");
            return dataSource;
        }

        // --- AWS Lambda環境でのSecrets Managerからの読み込み ---
        log.info("AWS Lambdaで実行中です。Secrets ManagerからDB認証情報を取得します: {}", secretArn);

        Region region = Region.of(AWS_REGION);

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(region)
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretArn)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            String secretString = response.secretString();

            if (secretString == null) {
                throw new IllegalStateException("Secrets Managerが空のシークレット文字列を返しました。");
            }

            // JSONを解析してSupabaseの接続情報を抽出
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(secretString);

            // Supabase接続情報を抽出 (Secrets Managerに登録したJSONキーと一致)
            String host = root.get("host").asText();
            String port = root.get("port").asText();
            String dbname = root.get("dbname").asText();
            String username = root.get("username").asText();
            String password = root.get("password").asText();

            String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s", host, port, dbname);

            // データソースを構成
            DriverManagerDataSource dataSource = new DriverManagerDataSource();
            dataSource.setDriverClassName("org.postgresql.Driver");
            dataSource.setUrl(jdbcUrl);
            dataSource.setUsername(username);
            dataSource.setPassword(password);

            log.info("Secrets Managerを使用してDataSourceを設定しました。 [ホスト: {}]", host);
            return dataSource;

        } catch (Exception e) {
            log.error("Secrets Managerからのシークレット取得または解析に失敗しました。", e);
            throw new RuntimeException("データベース接続設定に失敗しました。", e);
        }
    }
}