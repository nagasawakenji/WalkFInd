package nagasawakenji.walkfind.exception;

/**
 * 認証処理（Cognitoログイン、JWT解析、ユーザー自動登録など）に失敗した場合にスローされる非チェック例外。
 * Controllerで捕捉され、HTTP 401 / 500 などに変換される想定。
 */
public class AuthenticationProcessingException extends RuntimeException {

    // エラーの種類を示すコード (AUTH_FAILED, TOKEN_INVALID, USER_SYNC_FAILED など)
    private final String errorCode;

    /**
     * 1. メッセージとエラーコードを受け取るコンストラクタ
     */
    public AuthenticationProcessingException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * 2. メッセージ、原因、エラーコードを受け取るコンストラクタ
     */
    public AuthenticationProcessingException(String message, Throwable cause, String errorCode) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}