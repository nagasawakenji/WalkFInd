package nagasawakenji.walkfind.config;

import nagasawakenji.walkfind.infra.queue.SqsProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

import java.net.URI;

@Configuration
@EnableConfigurationProperties(SqsProperties.class)
public class SqsConfig {

    @Bean
    public SqsClient sqsClient(SqsProperties props) {
        var builder = SqsClient.builder().region(Region.of(props.getRegion()));

        // localの場合
        if (props.getEndpointUrl() != null && !props.getEndpointUrl().isBlank()) {
            builder = builder
                    .endpointOverride(URI.create(props.getEndpointUrl()))
                    .credentialsProvider(
                            StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test"))
                    );
        } else {
            builder = builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }
}
