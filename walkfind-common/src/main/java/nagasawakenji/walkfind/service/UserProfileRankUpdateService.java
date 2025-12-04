package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ユーザープロフィールの best_rank を更新する専用サービス
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileRankUpdateService {

    private final UserProfileMapper userProfileMapper;

    /**
     * あるコンテストの確定順位を元に best_rank を更新する
     *
     * @param contestId 集計済みのコンテストID
     */
    @Transactional
    public void updateBestRanksForContest(Long contestId) {

        log.info("Start updating best_rank for contestId={}", contestId);

        int updatedCount = userProfileMapper.updateBestRankByContestId(contestId);

        log.info("Finished updating best_rank. Updated rows={}", updatedCount);
    }
}