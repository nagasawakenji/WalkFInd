package nagasawakenji.walkfind.domain.statusenum;

public enum CreationContestStatus {
    SUCCESS, // コンテスト作成成功
    FAILED,// コンテスト作成失敗
    INTERNAL_SEVER_ERROR ,// 内部エラー
    NAME_DUPLICATED, // 名前の重複
    INVALID_DATE // 設定期間の不正
}
