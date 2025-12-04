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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class LocalPhotoSubmissionService {

    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper;
    private final UserProfileMapper userProfileMapper;
    private final LocalStorageUploadService localStorageUploadService;
    private final UserProfileContestEntryService userProfileContestEntryService;

    @Transactional
    public SubmitPhotoResult submitPhoto(SubmitPhotoRequest request, String userId, MultipartFile file) {

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

        // ストレージへの写真保存の実行
        String savedPhotoUrl = null; // 削除用にスコープを外に出す
        try {
            // getOriginalFilename()を使用。拡張子を維持するのが望ましい。
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.lastIndexOf(".") > 0) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String key = UUID.randomUUID().toString() + ext;

            // 戻り値をキャッチする
            savedPhotoUrl = localStorageUploadService.saveFile(file, key);

        } catch (Exception e) {
            log.error("Storage upload failed: " + e.getMessage());
            throw new RuntimeException("写真の保存に失敗しました", e);
        }

        // Modelの構築 (ControllerからのリクエストDTOと認証IDをModelに変換)
        UserPhoto newPhoto = new UserPhoto();
        newPhoto.setContestId(contestId);
        newPhoto.setUserId(userId);
        newPhoto.setPhotoUrl(savedPhotoUrl);
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


            int updated = userProfileMapper.incrementTotalPosts(userId);
            if (updated == 0) {
                log.error("Failed to increment total_posts for userId={}", userId);
                throw new DatabaseOperationException("プロフィールの投稿数更新に失敗しました。");
            }

            // 成功結果の返却
            return buildResult(newPhoto.getId(), SubmitPhotoStatus.SUCCESS, "写真の投稿が完了しました。");

        } catch (DatabaseOperationException e) {
            // 自らスローした例外。再スローしてトランザクションをロールバックさせる。
            if (savedPhotoUrl != null) {
                // ※ LocalStorageUploadServiceに deleteFile メソッドを追加してください
                localStorageUploadService.deleteFile(savedPhotoUrl);
            }
            throw e;
        } catch (Exception e) {
            // SQL/接続エラーなど予期せぬエラー。RuntimeExceptionにラップしてスロー。
            if (savedPhotoUrl != null) {
                // ※ LocalStorageUploadServiceに deleteFile メソッドを追加してください
                localStorageUploadService.deleteFile(savedPhotoUrl);
            }
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
