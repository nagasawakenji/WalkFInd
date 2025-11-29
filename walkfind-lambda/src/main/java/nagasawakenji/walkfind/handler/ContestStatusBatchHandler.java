package nagasawakenji.walkfind.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import nagasawakenji.walkfind.WalkFindLambdaApplication;
import nagasawakenji.walkfind.domain.dto.ContestStatusUpdateResult;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.service.ContestStatusBatchService;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import lombok.extern.slf4j.Slf4j;

/**
 * コンテスト状態更新用のバッチLambdaハンドラ
 * EventBridgeから定期実行される
 */
@Slf4j
public class ContestStatusBatchHandler implements RequestHandler<Object, ContestStatusUpdateResult> {

    private static ConfigurableApplicationContext applicationContext;

    static {
        applicationContext = SpringApplication.run(WalkFindLambdaApplication.class);
        log.info("ContestStatusBatch Spring Context initialized.");
    }

    private final ContestStatusBatchService batchService;

    public ContestStatusBatchHandler() {
        this.batchService = applicationContext.getBean(ContestStatusBatchService.class);
    }

    @Override
    public ContestStatusUpdateResult handleRequest(Object event, Context context) {

        ContestStatusUpdateResult result = batchService.updateAllStatuses();

        log.info("Contest Status Batch Result: IN_PROGRESS={}, CLOSED_VOTING={}, ANNOUNCED={}",
                result.getMovedToInProgress(),
                result.getMovedToClosedVoting(),
                result.getMovedToAnnounced()
        );

        return result;
    }
}