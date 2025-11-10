package nagasawakenji.WalkFind.exception;

public class ContestStatusException extends RuntimeException {

    // エラーの種類を示すコード (NOT_FOUND, UNAVAILABLEなど)
    private final String errorCode;

    // メッセージのみを受け取るコンストラクタ
    public ContestStatusException(String message, String errorCode) {
      super(message);
      this.errorCode = errorCode;
    }

    // メッセージとthrowableを受け取るコンストラクタ
    public ContestStatusException(String message, Throwable cause, String errorCode) {
      super(message, cause);
      this.errorCode = errorCode;
    }

  public String getErrorCode() {
    return errorCode;
  }
}
