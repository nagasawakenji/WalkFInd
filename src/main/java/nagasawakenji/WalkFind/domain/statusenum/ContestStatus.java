package nagasawakenji.WalkFind.domain.statusenum;

public enum ContestStatus {
    UPCOMING,       // 開催前（投稿受付開始前）
    IN_PROGRESS,    // 開催中（投稿受付中、投票受付中）
    CLOSED_VOTING,  // 投稿・投票期間終了（結果集計・審査待ち）
    ANNOUNCED      // 結果発表済（コンテスト完了）
}
