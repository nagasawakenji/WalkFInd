package nagasawakenji.walkfind.infra.queue;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "walkfind.sqs")
public class SqsProperties {
    /**
     * sqsの環境変数を入れる
     * ローカルとlambda環境で設定変数が異なるので、差分をここで吸収する
     */

    private String endpointUrl;
    private String queueUrl;
    private String region = "ap-northeast-1";
}
