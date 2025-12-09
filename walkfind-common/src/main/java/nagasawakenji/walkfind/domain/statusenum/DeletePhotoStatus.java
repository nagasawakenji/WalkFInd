package nagasawakenji.walkfind.domain.statusenum;

public enum DeletePhotoStatus {
    SUCCESS,
    NOT_FOUND,             // 対象写真なし
    FORBIDDEN,             // 他人の写真など権限なし
    FAILED,                // rows = 0 など想定外の失敗
    INTERNAL_SERVER_ERROR  // ハンドラで使う用
}
