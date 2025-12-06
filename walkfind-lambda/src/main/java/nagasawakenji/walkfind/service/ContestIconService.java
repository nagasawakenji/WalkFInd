package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestIconListResponse;
import nagasawakenji.walkfind.domain.dto.ContestIconResponse;
import nagasawakenji.walkfind.domain.model.ContestIcon;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestIconMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestIconService {

    private final ContestIconMapper contestIconMapper;
    private final S3UploadPresignService s3UploadPresignService;
    private final S3DownloadPresignService s3DownloadPresignService;
    private final S3DeleteService s3DeleteService;

    /**
     * コンテストIDからアイコンURL（署名付きダウンロードURL）を取得
     */
    public ContestIconListResponse getIconUrl(List<Long> contestIds) {

        List<ContestIcon> icons = contestIconMapper.findByContestIds(contestIds);

        // DBのKeyを署名付きURLに変換してレスポンスを作成
        List<ContestIconResponse> response = icons.stream().map(icon -> {
            String key = icon.getIconUrl();
            URL presignedUrl = null;
            if (key != null && !key.isBlank()) {
                presignedUrl = s3DownloadPresignService.generatedDownloadUrl(key);
            }

            return ContestIconResponse.builder()
                    .contestId(icon.getContestId())
                    .iconUrl(presignedUrl != null ? presignedUrl.toString() : null)
                    .success(true)
                    .message("取得成功")
                    .build();
        }).toList();

        return ContestIconListResponse.builder()
                .icons(response)
                .totalCount(icons.size())
                .build();
    }


    /**
     * 【Step 2】S3へのアップロード完了後、DBを更新する（補償トランザクション付き）
     * フロントエンドがS3へのアップロードに成功した後、このメソッドを呼び出す想定
     *
     * @param contestId コンテストID
     * @param newKey    S3にアップロードされた新しいファイルのキー
     */
    @Transactional
    public ContestIconResponse registerUploadedIcon(Long contestId, String newKey) {
        String oldKey = null;
        boolean isUpdate = false;

        try {
            // ① 旧アイコンキー取得
            Optional<ContestIcon> existingOpt = contestIconMapper.findByContestId(contestId);
            if (existingOpt.isPresent()) {
                oldKey = existingOpt.get().getIconUrl();
                isUpdate = true;
            }

            // ② DB登録 or 更新
            if (isUpdate) {
                ContestIcon icon = existingOpt.get();
                icon.setIconUrl(newKey);
                contestIconMapper.update(icon);
                log.info("Updated contest icon for contestId={}", contestId);
            } else {
                ContestIcon icon = ContestIcon.builder()
                        .contestId(contestId)
                        .iconUrl(newKey)
                        .build();
                contestIconMapper.insert(icon);
                log.info("Inserted new contest icon for contestId={}", contestId);
            }

        } catch (Exception e) {
            // 【補償トランザクション】
            // DB登録に失敗した場合、S3にアップロードされてしまった"新しいファイル"はゴミになるため削除する
            log.error("DB update failed. Executing compensating transaction (delete S3 object): key={}", newKey, e);
            try {
                s3DeleteService.delete(newKey);
            } catch (Exception deleteEx) {
                log.error("Failed to delete orphaned S3 file during compensation: key={}", newKey, deleteEx);
            }
            // 元の例外を再スローしてトランザクションをロールバックさせる
            throw e;
        }

        // ③ DB更新成功後、古いファイルがあれば削除（非同期でも可だがここでは同期実行）
        if (oldKey != null && !oldKey.isBlank() && !oldKey.equals(newKey)) {
            try {
                s3DeleteService.delete(oldKey);
                log.info("Deleted old S3 file: key={}", oldKey);
            } catch (Exception e) {
                // 古いファイルの削除失敗はメイン処理の失敗とはしない（ログ出力のみ）
                log.warn("Failed to delete old icon file for contestId={}, key={}", contestId, oldKey, e);
            }
        }

        // DBに保存されているのはKeyだが、レスポンスとして返す際は署名付きURLに変換するか、
        // あるいはKeyだけを返してフロント側で再取得させる設計による。
        // ここでは確認用にダウンロードURLを生成して返す。
        String viewUrl = s3DownloadPresignService.generatedDownloadUrl(newKey).toString();

        return ContestIconResponse.builder()
                .contestId(contestId)
                .iconUrl(viewUrl)
                .success(true)
                .message(isUpdate ? "アイコンを更新しました" : "アイコンを新規登録しました")
                .build();
    }

    /**
     * アイコン削除（レコード削除 + S3ファイル削除）
     */
    @Transactional
    public ContestIconResponse deleteIcon(Long contestId) {
        Optional<ContestIcon> existingOpt = contestIconMapper.findByContestId(contestId);

        if (existingOpt.isEmpty()) {
            return ContestIconResponse.builder()
                    .contestId(contestId)
                    .success(false)
                    .message("削除対象のアイコンが存在しません")
                    .build();
        }

        String key = existingOpt.get().getIconUrl();

        // DB削除
        contestIconMapper.deleteByContestId(contestId);
        log.info("Deleted contest icon record for contestId={}", contestId);

        // S3削除
        if (key != null && !key.isBlank()) {
            try {
                s3DeleteService.delete(key);
            } catch (Exception e) {
                log.error("Failed to delete S3 file for contestId={}, key={}", contestId, key, e);
                // DB削除は完了しているので、S3削除失敗はログのみとする（あるいはリトライキューに入れるなど）
            }
        }

        return ContestIconResponse.builder()
                .contestId(contestId)
                .success(true)
                .message("アイコンを削除しました")
                .build();
    }
}