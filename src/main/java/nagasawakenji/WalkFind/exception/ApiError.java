package nagasawakenji.walkfind.exception;

/**
 * 一般的なエラーを担当する
 */
public class ApiError extends RuntimeException {

    private final String errorCode;

    public ApiError(String message, String errorCode) {
      super(message);
      this.errorCode = errorCode;
    }

    public ApiError(String message, Throwable cause, String errorCode) {
      super(message, cause);
      this.errorCode = errorCode;
    }

}
