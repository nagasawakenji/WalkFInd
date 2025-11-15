package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ContestMapper {

    // 現在開催中または結果発表前のコンテストをリストで取得
    List<Contest> findAllActiveContests();

    // 指定されたIDのコンテスト詳細を取得 (データがない場合はOptional.empty())
    Optional<Contest> findById(Long contestId);

    // コンテストの現在のステータスと期間を取得
    Optional<Contest> findContestStatus(Long contestId);

    // 新しいコンテストを作成（管理者機能）
    int insert(Contest contest);

    // 集計を実行するコンテストを取得する
    List<Contest> findContestsNeedingCalculation();

    // コンテストのstatusを変更する
    int updateContestStatus(Long contestId, ContestStatus status);

    // 名前からコンテストの存在確認を行う
    boolean isExistContestByName(String name);
}
