package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface ContestMapper {

    // 現在開催中または結果発表前のコンテストをリストで取得
    List<Contest> findAllActiveContests();

    // 結果発表済みのコンテストをリストで取得
    List<Contest> findAnnouncedContest(@Param("page") int page, @Param("size") int size);

    // 指定されたIDのコンテスト詳細を取得 (データがない場合はOptional.empty())
    Optional<Contest> findById(Long contestId);

    // コンテストの現在のステータスと期間を取得
    Optional<Contest> findContestStatus(Long contestId);

    // 新しいコンテストを作成（管理者機能）
    int insert(Contest contest);

    // 集計を実行するコンテストを取得する
    List<Contest> findContestsNeedingCalculation();

    // コンテストのstatusを変更する
    int updateContestStatus(@Param("contestId") Long contestId, @Param("status") ContestStatus status);

    // 名前からコンテストの存在確認を行う
    boolean isExistContestByName(String name);

    // コンテストのステータス更新(UPCOMING → IN_PROGRESS)
    int updateToInProgress(OffsetDateTime now);

    // コンテストのステータス更新(IN_PROGRESS → CLOSED_VOTING)
    int updateToClosedVoting(OffsetDateTime now);

    // コンテストのステータス更新(CLOSED_VOTING → ANNOUNCED)
    int updateToAnnouncedIfCalculated();

    // コンテストのアップデート
    int update(Contest contest);

    // コンテストの削除
    int deleteById(@Param("contestId") Long contestId);
}
