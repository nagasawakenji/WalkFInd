package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoItem;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoListResponse;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoRow;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.SimilarModelPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoEmbeddingMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimilarModelPhotoService {

    private final ContestMapper contestMapper;
    private final PhotoMapper photoMapper; // user_photos を読む想定（findById等）
    private final ContestModelPhotoMapper contestModelPhotoMapper;
    private final PhotoEmbeddingMapper photoEmbeddingMapper;

    /**
     * ユーザー投稿写真(userPhotoId)に対して、モデル写真TopKを返す
     */
    @Transactional(readOnly = true)
    public SimilarModelPhotoListResponse findSimilarModelPhotos(
            Long contestId,
            Long userPhotoId,
            String requesterUserId,
            Integer limit
    ) {
        if (contestId == null || userPhotoId == null || requesterUserId == null || requesterUserId.isBlank()) {
            return SimilarModelPhotoListResponse.builder()
                    .status(SimilarModelPhotoStatus.INVALID_REQUEST)
                    .models(List.of())
                    .build();
        }

        int k = (limit == null || limit <= 0) ? 10 : Math.min(limit, 100);

        try {
            // contest存在チェック
            Contest contest = contestMapper.findById(contestId).orElse(null);
            if (contest == null) {
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.CONTEST_NOT_FOUND)
                        .models(List.of())
                        .build();
            }

            // user_photo存在チェック（投稿が本当にそのcontestのものか)
            UserPhoto userPhoto = photoMapper.findById(userPhotoId)
                    .orElse(null);
            if (userPhoto == null || userPhoto.getContestId() == null || !userPhoto.getContestId().equals(contestId)) {
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.USER_PHOTO_NOT_FOUND)
                        .models(List.of())
                        .build();
            }
            // 論理削除を弾く
            if (userPhoto.getRemovedAt() != null) {
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.USER_PHOTO_NOT_FOUND)
                        .models(List.of())
                        .build();
            }

            // 認可：作成者 or 投稿者本人のみ（必要に応じてルール変更OK）
            boolean isContestOwner = requesterUserId.equals(contest.getCreatedByUserId());
            boolean isPhotoOwner = requesterUserId.equals(userPhoto.getUserId());

            if (!isContestOwner && !isPhotoOwner) {
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.FORBIDDEN)
                        .models(List.of())
                        .build();
            }

            // モデル写真が1枚もないなら、ここで即return
            if (contestModelPhotoMapper.findByContestId(contestId).isEmpty()) {
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.NO_MODEL_EMBEDDINGS)
                        .models(List.of())
                        .build();
            }

            // 類似検索（pgvector）
            List<SimilarModelPhotoRow> rows =
                    photoEmbeddingMapper.findSimilarList(contestId, userPhotoId, k);

            // 0件の切り分け（embeddingが未生成/未READYなど）
            if (rows == null || rows.isEmpty()) {
                boolean userReady = photoEmbeddingMapper.existsUserEmbeddingReady(contestId, userPhotoId);
                if (!userReady) {
                    return SimilarModelPhotoListResponse.builder()
                            .status(SimilarModelPhotoStatus.EMBEDDING_NOT_READY)
                            .models(List.of())
                            .build();
                }

                boolean modelReadyAny = photoEmbeddingMapper.existsAnyModelEmbeddingReadyForContest(contestId);
                if (!modelReadyAny) {
                    return SimilarModelPhotoListResponse.builder()
                            .status(SimilarModelPhotoStatus.NO_MODEL_EMBEDDINGS)
                            .models(List.of())
                            .build();
                }

                // ここに来るのは「ユーザーはREADYだが、model_version一致が無い」など
                return SimilarModelPhotoListResponse.builder()
                        .status(SimilarModelPhotoStatus.NO_MODEL_EMBEDDINGS)
                        .models(List.of())
                        .build();
            }

            // DTOへ詰め替え
            List<SimilarModelPhotoItem> models = rows.stream()
                    .map(r -> SimilarModelPhotoItem.builder()
                            .modelPhotoId(r.getModelPhotoId())
                            .contestId(r.getContestId())
                            .key(r.getKey())
                            .title(r.getTitle())
                            .description(r.getDescription())
                            .createdAt(r.getCreatedAt())
                            .similarity(r.getSimilarity())
                            .build())
                    .toList();

            return SimilarModelPhotoListResponse.builder()
                    .status(SimilarModelPhotoStatus.SUCCESS)
                    .models(models)
                    .build();

        } catch (Exception e) {
            log.error("Failed to find similar model photos. contestId={}, userPhotoId={}", contestId, userPhotoId, e);
            throw new DatabaseOperationException("Failed to find similar model photos", e);
        }
    }
}