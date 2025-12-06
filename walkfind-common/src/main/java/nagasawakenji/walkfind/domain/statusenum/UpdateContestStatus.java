package nagasawakenji.walkfind.domain.statusenum;

public enum UpdateContestStatus {
    SUCCESS,                // 正常に更新完了
    NOT_FOUND,              // 指定IDのコンテストが存在しない
    NAME_DUPLICATED,        // 同名コンテストが既に存在
    INVALID_DATE,           // 日付の整合性エラー
    BUSINESS_RULE_VIOLATION,// ビジネスルール違反（必要なら利用）
    FAILED,                 // バリデーション失敗など一般的な失敗
    INTERNAL_SERVER_ERROR   // サーバー内部エラー
}
