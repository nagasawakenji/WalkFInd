package nagasawakenji.walkfind.domain.statusenum;

public enum SimilarityStatus {
    READY,              // 自分の写真のembeddingがREADY & モデルが存在
    NOT_READY,          // 自分の写真のembeddingがまだ
    NO_MODEL_PHOTOS     // モデル写真が存在しない（またはモデルembeddingが無い）
}
