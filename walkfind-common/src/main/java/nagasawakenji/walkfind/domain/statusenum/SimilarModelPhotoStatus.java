package nagasawakenji.walkfind.domain.statusenum;

public enum SimilarModelPhotoStatus {
    SUCCESS,
    CONTEST_NOT_FOUND,
    USER_PHOTO_NOT_FOUND,
    EMBEDDING_NOT_READY,
    NO_MODEL_EMBEDDINGS,
    FORBIDDEN,
    INVALID_REQUEST,
    INTERNAL_SERVER_ERROR
}
