package nagasawakenji.WalkFind.infra.mybatis.mapper;

import nagasawakenji.WalkFind.domain.model.Contest;
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
}
