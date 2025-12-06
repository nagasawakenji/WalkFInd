package nagasawakenji.walkfind.domain.statusenum;

public enum DeleteContestStatus {
    SUCCESS,                // 正常に削除完了
    NOT_FOUND,              // 対象コンテストが存在しない
    BUSINESS_RULE_VIOLATION,// ビジネスルール違反（開催中/終了済みなどで削除不可）
    FAILED,                 // その他失敗
    INTERNAL_SERVER_ERROR   // サーバー内部エラー
}