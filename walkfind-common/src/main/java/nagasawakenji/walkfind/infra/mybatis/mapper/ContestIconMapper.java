package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.model.ContestIcon;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ContestIconMapper {

    // contestId からアイコンを取得（ない場合 Optional.empty）
    Optional<ContestIcon> findByContestId(@Param("contestId") Long contestId);

    List<ContestIcon> findByContestIds(@Param("ids") List<Long> ids);
    // 新規作成
    void insert(ContestIcon icon);

    // 更新（アイコン差し替え）
    void update(ContestIcon icon);

    // アイコン削除（URL を null にする or レコード自体を削除）
    void deleteByContestId(@Param("contestId") Long contestId);
}
