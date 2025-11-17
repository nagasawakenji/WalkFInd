package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.CreatingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.CreationContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class CreatingContestService {

    private final ContestMapper contestMapper;

    /**
     * (管理者用) コンテスト作成ロジック
     *
     * @param name
     * @param theme
     * @param startDate
     * @param endDate
     * @return　CreateContestResponse
     */
    @Transactional
    public CreatingContestResponse createContest(
            String name,
            String theme,
            OffsetDateTime startDate,
            OffsetDateTime endDate
    ) {

        OffsetDateTime now = OffsetDateTime.now();
        // nameの重複確認
        if (contestMapper.isExistContestByName(name)) {
            return CreatingContestResponse.builder()
                    .status(CreationContestStatus.NAME_DUPLICATED)
                    .message("コンテスト名が重複しています")
                    .build();
        }

        // 開始時間,終了時間確認
        if (startDate.isBefore(now)) {
            return CreatingContestResponse.builder()
                    .status(CreationContestStatus.INVALID_DATE)
                    .message("開始日は現在より後にしてください")
                    .build();
        }

        if (!endDate.isAfter(startDate)) {
            return CreatingContestResponse.builder()
                    .status(CreationContestStatus.INVALID_DATE)
                    .message("終了日は開始日より後に設定してください")
                    .build();
        }

        // コンテストの作成
        Contest createdContest = new Contest();
        createdContest.setName(name);
        createdContest.setTheme(theme);
        createdContest.setStartDate(startDate);
        createdContest.setEndDate(endDate);
        createdContest.setStatus(ContestStatus.UPCOMING);

        try {
            int inserted = contestMapper.insert(createdContest);

            if (inserted == 0) {
                log.error("DB insertion failed for unknown reason. Rows affected: 0");
                // データベース操作失敗は非チェック例外としてスローし、ロールバックさせる
                throw new DatabaseOperationException("投稿データの保存に失敗しました。");
            }
            return mapToCreatingContestResponse(createdContest);
        }  catch (DatabaseOperationException e) {
            // 自らスローした例外。再スローしてトランザクションをロールバックさせる。
            throw e;
        } catch (Exception e) {
            // SQL/接続エラーなど予期せぬエラー。RuntimeExceptionにラップしてスロー。
            log.error("Database error during contest creation.", e);
            throw new RuntimeException("DB処理中に予期せぬエラーが発生しました。", e); // ★ RuntimeExceptionを再スロー
        }
    }


    // CreatingContestResponse作成ヘルパー
    private CreatingContestResponse mapToCreatingContestResponse(Contest contest) {
        CreatingContestResponse response = CreatingContestResponse.builder()
                .contestId(contest.getId())
                .status(CreationContestStatus.SUCCESS)
                .name(contest.getName())
                .theme(contest.getTheme())
                .message("コンテストを作成しました")
                .build();

        return response;
    }

}
