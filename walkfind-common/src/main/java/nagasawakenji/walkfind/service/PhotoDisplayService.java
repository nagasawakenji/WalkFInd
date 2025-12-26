package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.PhotoListResponse;
import nagasawakenji.walkfind.domain.dto.PhotoResponse;
import nagasawakenji.walkfind.domain.statusenum.SimilarityStatus;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoEmbeddingMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoDisplayService {

    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper; // コンテストの存在確認用
    private final PhotoEmbeddingMapper photoEmbeddingMapper;

    /**
     * 特定のコンテストに投稿された全ての写真リストを取得する。
     * 多数のユーザーがアクセスするため、リードオンリーで高速なクエリを使用する。
     *
     * @param contestId 表示対象のコンテストID
     * @return 投稿写真のリスト (PhotoResponse DTO)
     */
    @Transactional(readOnly = true)
    public PhotoListResponse getPhotosByContest(Long contestId, int page, int size, String requiredUserId) {

        // コンテストの存在確認
        if (contestMapper.findById(contestId).isEmpty()) {
            throw new ContestNotFoundException("Contest with ID " + contestId + " not found.", "NOT_FOUND");
        }

        // DBからデータを取得
        // PhotoMapper.xml内で user_photos と users をJOINし、投票数順でソートするクエリが実行される
        List<PhotoResponse> photos = photoMapper.findAllPhotosByContest(contestId, page, size, page * size);

        long totalCount = photoMapper.countTotalPhotos(contestId);

        PhotoListResponse response = PhotoListResponse.builder()
                .photoResponses(photos)
                .totalCount(totalCount)
                .build();

        // similarityStatus は開催中は「自分の投稿」だけに付与する。
        // requiredUserId が null/blank の場合は一切付与しない（全件 null のまま）
        // model embedding が ready でない場合も一切付与しない（全件 null のまま）
        boolean modelEmbeddingReady = photoEmbeddingMapper.existsAnyModelEmbeddingReadyForContest(contestId);
        if (modelEmbeddingReady && requiredUserId != null && !requiredUserId.isBlank()) {

            // 自分の写真だけを対象にして READY 判定を行う（他人の写真の状態は見ない）
            List<Long> myPhotoIds = photos.stream()
                    .filter(p -> requiredUserId.equals(p.getUserId()))
                    .map(PhotoResponse::getPhotoId)
                    .toList();

            if (!myPhotoIds.isEmpty()) {
                Set<Long> readySet = new HashSet<>(photoEmbeddingMapper.findReadyUserPhotoIds(contestId, myPhotoIds));

                photos.forEach(photo -> {
                    if (!requiredUserId.equals(photo.getUserId())) {
                        // 他人の写真は status を付与しない
                        return;
                    }
                    // 自分の写真だけ status を付与
                    photo.setStatus(
                            readySet.contains(photo.getPhotoId())
                                    ? SimilarityStatus.READY
                                    : SimilarityStatus.NOT_READY
                    );
                });
            }
        }

        log.info("Found {} photos for contest ID {}.", photos.size(), contestId);

        return response;
    }
}