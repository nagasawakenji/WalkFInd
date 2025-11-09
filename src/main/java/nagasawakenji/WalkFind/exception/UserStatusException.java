package nagasawakenji.WalkFind.exception;

/**
 * ユーザーの状態に関するビジネスルール違反（例：アカウント停止、ユーザー未登録）を示す例外。
 * Service層でthrowされ、Controller層で捕捉され、適切なHTTPステータス（404, 403など）に変換されることを想定。
 */
public class UserStatusException extends RuntimeException {

  // エラーの種類を示すコード
  private final String errorCode;

  // 1. メッセージとエラーコードを受け取るコンストラクタ
  public UserStatusException(String message, String errorCode) {
    super(message);
    this.errorCode = errorCode;
  }

  // 2. メッセージ、原因、エラーコードを受け取るコンストラクタ
  public UserStatusException(String message, Throwable cause, String errorCode) {
    super(message, cause);
    this.errorCode = errorCode;
  }

  public String getErrorCode() {
    return errorCode;
  }
}