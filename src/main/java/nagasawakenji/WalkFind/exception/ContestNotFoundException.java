package nagasawakenji.WalkFind.exception;

/**
 * 指定されたコンテストIDに該当するコンテストが存在しない場合にスローされる非チェック例外。
 * Controllerで捕捉され、HTTP 404 Not Foundを返すために使用されます。
 */
public class ContestNotFoundException extends RuntimeException {

    // エラーの種類を示すコード (NOT_FOUND, UNAVAILABLEなど)
    private final String errorCode;

    // 1. メッセージとエラーコードを受け取るコンストラクタ
    public ContestNotFoundException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    // 2. メッセージ、原因、エラーコードを受け取るコンストラクタ
    public ContestNotFoundException(String message, Throwable cause, String errorCode) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}