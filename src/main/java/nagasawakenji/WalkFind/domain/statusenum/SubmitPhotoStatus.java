package nagasawakenji.walkfind.domain.statusenum;

public enum SubmitPhotoStatus {
    // 投稿が正常に処理・保存された
    SUCCESS,

    // 投稿が重複している、期間外であるなど、ビジネスロジック上のルール違反
    BUSINESS_RULE_VIOLATION,

    // 入力データ（DTO）の形式や必須項目のバリデーションエラー
    VALIDATION_FAILED,

    // データベース接続失敗など、予期せぬサーバー側のエラー
    INTERNAL_SERVER_ERROR
}
