package nagasawakenji.WalkFind.exception;

/**
 * データベース操作（INSERT, UPDATE, DELETEなど）が失敗した場合にスローされる非チェック例外。
 * Springの@Transactionalによって、この例外がスローされると自動的にロールバックがトリガーされます。
 */
public class DatabaseOperationException extends RuntimeException {

    // 1. メッセージのみを受け取るコンストラクタ
    public DatabaseOperationException(String message) {
        super(message);
    }

    // 2. メッセージと原因となったThrowableを受け取るコンストラクタ
    public DatabaseOperationException(String message, Throwable cause) {
        super(message, cause);
    }

    // 3. 原因となったThrowableのみを受け取るコンストラクタ
    public DatabaseOperationException(Throwable cause) {
        super(cause);
    }
}