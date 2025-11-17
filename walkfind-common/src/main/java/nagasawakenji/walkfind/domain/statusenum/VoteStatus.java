package nagasawakenji.walkfind.domain.statusenum;

/**
 * 投票処理のビジネスロジックの結果を示すEnum。
 */
public enum VoteStatus {
    SUCCESS,                // 投票成功
    ALREADY_VOTED,          // 既に投票済み（ビジネスルール違反）
    VOTING_CLOSED,          // 投票期間外（ビジネスルール違反）
    PHOTO_NOT_FOUND,        // 投票対象の投稿が存在しない（バリデーション/存在チェック違反）
    INTERNAL_SERVER_ERROR   // サーバー側の予期せぬエラー
}