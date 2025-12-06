package nagasawakenji.walkfind.domain.statusenum;

public enum UpdateUserProfileStatus {
    SUCCESS,
    NOT_FOUND,          // user_profiles が存在しない（想定外だが防御用）
    FAILED,
    INTERNAL_SERVER_ERROR
}