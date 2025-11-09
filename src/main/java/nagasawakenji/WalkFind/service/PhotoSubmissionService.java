package nagasawakenji.WalkFind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.WalkFind.domain.dto.SubmitPhotoRequest;
import nagasawakenji.WalkFind.domain.dto.SubmitPhotoResult;
import nagasawakenji.WalkFind.domain.model.Contest;
import nagasawakenji.WalkFind.domain.model.UserPhoto;
import nagasawakenji.WalkFind.domain.statusenum.ContestStatus;
import nagasawakenji.WalkFind.domain.statusenum.SubmitPhotoStatus;
import nagasawakenji.WalkFind.exception.DatabaseOperationException;
import nagasawakenji.WalkFind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.WalkFind.infra.mybatis.mapper.PhotoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhotoSubmissionService {

    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper;

    @Transactional
    public SubmitPhotoResult submitPhoto(SubmitPhotoRequest request, String userId) {

        // DTOのバリデーションはController層で完了している前提
        Long contestId = request.getContestId();

        // コンテスト期間チェック (ビジネスルール)
        Optional<Contest> contestOpt = contestMapper.findContestStatus(contestId);

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

            // 成功結果の返却
            return buildResult(newPhoto.getId(), SubmitPhotoStatus.SUCCESS, "写真の投稿が完了しました。");

        } catch (DatabaseOperationException e) {
            // 自らスローした例外。再スローしてトランザクションをロールバックさせる。
            throw e;
        } catch (Exception e) {
            // SQL/接続エラーなど予期せぬエラー。RuntimeExceptionにラップしてスロー。
            log.error("Database error during photo submission.", e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e); // ★ RuntimeExceptionを再スロー
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
