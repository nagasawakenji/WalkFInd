package nagasawakenji.WalkFind.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import nagasawakenji.WalkFind.WalkFindApplication;
import nagasawakenji.WalkFind.domain.dto.CalculationResult;
import nagasawakenji.WalkFind.service.ResultCalculationService;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.List;

/**
 * 結果集計処理のためのLambdaハンドラ。
 * EventBridgeからのイベントを受け取り、ResultCalculationServiceを呼び出す。
 */
public class ResultCalculationHandler implements RequestHandler<Object, List<CalculationResult>> {

    // Springコンテキストを再利用するための静的変数
    // 静的変数として保持することで、実行速度を向上させている
    private static ConfigurableApplicationContext applicationContext;

    // 初期化ブロック (Lambdaのコールドスタート時に一度だけ実行される)
    static {
        // Spring Bootアプリケーションを起動
        applicationContext = SpringApplication.run(WalkFindApplication.class);
    }

    private final ResultCalculationService calculationService;

    public ResultCalculationHandler() {
        // 起動済みのSpringコンテキストからServiceを取得
        this.calculationService = applicationContext.getBean(ResultCalculationService.class);
    }

    @Override
    public List<CalculationResult> handleRequest(Object event, Context context) {

        // Serviceのメインロジックを呼び出す
        return calculationService.calculateAllClosedContests();
    }
}