package nagasawakenji.walkfind.handler;

import com.amazonaws.serverless.proxy.model.AwsProxyRequest;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import nagasawakenji.walkfind.WalkFindLambdaApplication;
import org.slf4j.MDC;

/**
 * API Gatewayからのストリームリクエストを処理するLambdaハンドラ。
 * Spring Boot 3環境では SpringBootStreamHandler を使用します。
 */
@Slf4j
public class StreamLambdaHandler implements RequestStreamHandler {

    private static SpringBootLambdaContainerHandler<AwsProxyRequest, AwsProxyResponse> handler;

    static {
        try {
            // getStreamHandlerは静的メソッドとして存在します。
            handler = SpringBootLambdaContainerHandler.getAwsProxyHandler(WalkFindLambdaApplication.class);


            log.info("SpringBootStreamHandler initialized successfully for Spring Boot 3.");
        } catch (Exception e) {
            log.error("Failed to initialize Spring Boot application context.", e);
            // 初期化失敗は致命的なエラーとしてRuntimeExceptionをスロー
            throw new RuntimeException("Could not start Spring Boot application in Lambda.", e);
        }
    }

    /**
     * API Gatewayからのリクエストストリームを処理し、Spring Bootのコントローラーに渡します。
     */
    @Override
    public void handleRequest(InputStream inputStream, OutputStream outputStream, Context context) throws IOException {

        String requestId = context != null ? context.getAwsRequestId() : "unknown";

        MDC.put("requestId", requestId);
        // ハンドラーにリクエスト処理を委譲
        handler.proxyStream(inputStream, outputStream, context);
        // Clear MDC to avoid leakage between Lambda invocations
        MDC.clear();
    }
}