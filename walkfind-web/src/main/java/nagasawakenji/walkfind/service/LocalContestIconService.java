package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.*;
import nagasawakenji.walkfind.domain.model.ContestIcon;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestIconMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocalContestIconService {

    private final ContestIconMapper contestIconMapper;
    private final LocalStorageUploadService localStorageUploadService;
    private final LocalStorageDownloadService localStorageDownloadService;

    /**
     * コンテストIDからアイコンURLを取得（存在しなければnull）
     * DB に保存されているのは「キー」なので、ローカル用の HTTP URL に変換して返す
     */
    public ContestIconListResponse getIconUrl(List<Long> contestIds) {

        List<ContestIcon> icons = contestIconMapper.findByContestIds(contestIds);

        List<ContestIconResponse> responses = icons.stream()
                .map(icon -> {
                    String key = icon.getIconUrl();
                    String url = null;

                    if (key != null && !key.isBlank()) {
                        try {
                            // 例: http://localhost:8080/api/v1/local-storage/contest-icons/xxx.png
                            url = localStorageDownloadService.generatedDownloadUrl(key).toString();
                        } catch (Exception e) {
                            log.error("Failed to generate local HTTP download URL for contestId={}, key={}",
                                    icon.getContestId(), key, e);
                        }
                    }

                    return ContestIconResponse.builder()
                            .contestId(icon.getContestId())
                            .iconUrl(url)
                            .success(url != null)
                            .message(url != null ? "アイコンを取得しました" : "アイコンURLの生成に失敗しました")
                            .build();
                })
                .toList();

        return ContestIconListResponse.builder()
                .icons(responses)
                .totalCount(responses.size())
                .build();
    }


    /**
     * アイコン画像アップロード + DB更新（補償トランザクション付き / 既存アイコンの差し替え対応）
     */
    @Transactional
    public ContestIconResponse uploadAndSaveIcon(Long contestId, MultipartFile file) {

        String newKey = null;
        String oldKey = null;

        try {
            // ① 旧アイコンキー取得
            Optional<ContestIcon> existingOpt = contestIconMapper.findByContestId(contestId);
            if (existingOpt.isPresent()) {
                oldKey = existingOpt.get().getIconUrl();
            }

            // ② 新しいファイル保存
            String original = file.getOriginalFilename();
            String ext = "";
            if (original != null && original.lastIndexOf(".") > -1) {
                ext = original.substring(original.lastIndexOf("."));
            }

            newKey = contestId + "-" + UUID.randomUUID() + ext;
            newKey = localStorageUploadService.saveFile(file, newKey);

            // ③ DB登録 or 更新
            Optional<ContestIcon> existing = contestIconMapper.findByContestId(contestId);

            if (existing.isPresent()) {
                ContestIcon icon = existing.get();
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

            // ④ 古いファイル削除
            if (oldKey != null && !oldKey.isBlank()) {
                try {
                    localStorageUploadService.deleteFile(oldKey);
                } catch (Exception e) {
                    log.error("Failed to delete old icon file for contestId={}, key={}", contestId, oldKey, e);
                }
            }

            return ContestIconResponse.builder()
                    .contestId(contestId)
                    .iconUrl(newKey)
                    .success(true)
                    .message(existingOpt.isPresent() ? "アイコンを更新しました" : "アイコンを新規登録しました")
                    .build();

        } catch (Exception e) {

            if (newKey != null) {
                localStorageUploadService.deleteFile(newKey);
            }

            return ContestIconResponse.builder()
                    .contestId(contestId)
                    .iconUrl(null)
                    .success(false)
                    .message("アイコンの更新に失敗しました")
                    .build();
        }
    }

    /**
     * アイコンを新規作成または更新
     */
    @Transactional
    public void saveOrUpdateIcon(Long contestId, String iconUrl) {
        Optional<ContestIcon> existing = contestIconMapper.findByContestId(contestId);

        if (existing.isPresent()) {
            ContestIcon icon = existing.get();
            icon.setIconUrl(iconUrl);
            contestIconMapper.update(icon);
            log.info("Updated contest icon for contestId={}", contestId);
        } else {
            ContestIcon icon = ContestIcon.builder()
                    .contestId(contestId)
                    .iconUrl(iconUrl)
                    .build();
            contestIconMapper.insert(icon);
            log.info("Inserted new contest icon for contestId={}", contestId);
        }
    }

    /**
     * アイコン削除（レコード自体を削除）
     */
    @Transactional
    public ContestIconResponse deleteIcon(Long contestId) {

        Optional<ContestIcon> existingOpt = contestIconMapper.findByContestId(contestId);

        if (existingOpt.isEmpty()) {
            return ContestIconResponse.builder()
                    .contestId(contestId)
                    .iconUrl(null)
                    .success(false)
                    .message("削除対象のアイコンが存在しません")
                    .build();
        }

        ContestIcon existing = existingOpt.get();
        String key = existing.getIconUrl();

        contestIconMapper.deleteByContestId(contestId);
        log.info("Deleted contest icon record for contestId={}", contestId);

        if (key != null && !key.isBlank()) {
            try {
                localStorageUploadService.deleteFile(key);
            } catch (Exception e) {
                log.error("Failed to delete local icon file for contestId={}, key={}", contestId, key, e);
            }
        }

        return ContestIconResponse.builder()
                .contestId(contestId)
                .iconUrl(null)
                .success(true)
                .message("アイコンを削除しました")
                .build();
    }

    /**
     * ContestIcon(モデル) → ContestIconResponse(返却dto)変換のハンドラ
     */
    private ContestIconResponse handleContestIconResponse(ContestIcon icon, String message) {
        return ContestIconResponse.builder()
                .contestId(icon.getContestId())
                .iconUrl(icon.getIconUrl())
                .success(true)
                .message(message)
                .build();
    }
}
