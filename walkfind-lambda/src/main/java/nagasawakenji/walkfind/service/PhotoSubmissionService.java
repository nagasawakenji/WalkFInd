package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.SubmitPhotoRequest;
import nagasawakenji.walkfind.domain.dto.SubmitPhotoResult;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.SubmitPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhotoSubmissionService {

    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper;
    private final S3DeleteService s3DeleteService;
    private final UserProfileMapper userProfileMapper;
    private final UserProfileContestEntryService userProfileContestEntryService;
    private final ApplicationEventPublisher eventPublisher;

    // ロールバックされる際は、必ずS3へ保存した写真を削除するようにする
    @Transactional
    public SubmitPhotoResult submitPhoto(SubmitPhotoRequest request, String userId) {
        // s3Keyを取得する
        String s3Key = request.getPhotoUrl();

        // DTOのバリデーションはController層で完了している前提
        Long contestId = request.getContestId();

        // コンテスト期間チェック (ビジネスルール)
        Optional<Contest> contestOpt = contestMapper.findContestStatus(contestId);

        // WARNING: ビジネスロジック違反でS3は触らない。
        if (contestOpt.isEmpty()) {
            log.warn("Contest ID {} not found.", contestId);
            return buildResult(null, SubmitPhotoStatus.BUSINESS_RULE_VIOLATION, "指定されたコンテストは存在しません。");
        }

        Contest contest = contestOpt.get();

        if (contest.getStatus() != ContestStatus.IN_PROGRESS) {
            log.warn("Contest {} is not in progress. Current status: {}", contestId, contest.getStatus());
            return buildResult(null, SubmitPhotoStatus.BUSINESS_RULE_VIOLATION, "投稿はコンテスト開催期間中のみ可能です。");
        }

        // 重複投稿チェック (ビジネスルール: 1コンテストにつき1枚のみ)
        if (photoMapper.findByContestAndUser(contestId, userId).isPresent()) {
            log.warn("User {} already submitted to contest {}.", userId, contestId);
            return buildResult(null, SubmitPhotoStatus.BUSINESS_RULE_VIOLATION, "このコンテストには既に投稿済みです。");
        }

        // Modelの構築 (ControllerからのリクエストDTOと認証IDをModelに変換)
        UserPhoto newPhoto = new UserPhoto();
        newPhoto.setContestId(contestId);
        newPhoto.setUserId(userId);
        newPhoto.setPhotoUrl(request.getPhotoUrl());
        newPhoto.setTitle(request.getTitle());
        newPhoto.setDescription(request.getDescription());

        // 4. DB登録
        try {
            int result = photoMapper.insert(newPhoto);

            if (result == 0) {
                log.error("DB insertion failed for unknown reason. Rows affected: 0");
                // データベース操作失敗は非チェック例外としてスローし、ロールバックさせる
                throw new DatabaseOperationException("投稿データの保存に失敗しました。");
            }

            userProfileContestEntryService
                    .incrementIfFirstEntry(userId, contest.getId());

            // DB登録が成功した後にのみ投稿数をインクリメントする
            int updated = userProfileMapper.incrementTotalPosts(userId);
            if (updated == 0) {
                log.error("Failed to increment total_posts for userId={}", userId);
                throw new DatabaseOperationException("プロフィールの投稿数更新に失敗しました。");
            }

            // AFTER_COMMIT で非同期処理（例: embedding作成）をキックするためのイベントを発火
            // ※ PhotoSubmittedEvent は walkfind-common 側などに定義済みの想定
            eventPublisher.publishEvent(
                    new nagasawakenji.walkfind.domain.event.PhotoSubmittedEvent(
                            "USER",
                            contestId,
                            newPhoto.getId(),
                            s3Key
                    )
            );

            // 成功結果の返却
            return buildResult(newPhoto.getId(), SubmitPhotoStatus.SUCCESS, "写真の投稿が完了しました。");

        } catch (DatabaseOperationException e) {
            safeDeleteFromS3(s3Key);
            // 自らスローした例外。再スローしてトランザクションをロールバックさせる。
            throw e;
        } catch (Exception e) {
            safeDeleteFromS3(s3Key);
            // SQL/接続エラーなど予期せぬエラー。RuntimeExceptionにラップしてスロー。
            log.error("Database error during photo submission.", e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e); // ★ RuntimeExceptionを再スロー
        }
    }

    /**
     * DB例外をS3例外が上書きしないようにするための関数
     * @param key
     */
    private void safeDeleteFromS3(String key) {
        if (key == null || key.isBlank()) {
            log.warn("S3 rollback skipped because key is null or blank");
            return;
        }

        try {
            s3DeleteService.delete(key);
        } catch (Exception e) {
            // DB例外を上書きしないよう、ここでのエラーは投げない
            log.error("S3 rollback failed. key={}", key, e);
        }


    }

    /**
     * 結果DTOを構築するヘルパーメソッド。
     */
    private SubmitPhotoResult buildResult(Long photoId, SubmitPhotoStatus status, String message) {
        return SubmitPhotoResult.builder()
                .photoId(photoId)
                .status(status)
                .message(message)
                .build();
    }
}
