package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileContestEntryService {

    private final UserProfileMapper userProfileMapper;

    /**
     * ユーザーが新しくコンテストに参加した場合のみ参加数を +1 する
     */
    @Transactional
    public void incrementIfFirstEntry(String userId, Long contestId) {

        int updated = userProfileMapper
                .incrementTotalContestsEnteredIfFirstTime(userId, contestId);

        if (updated > 0) {
            log.info("Incremented total_contests_entered: userId={}, contestId={}",
                    userId, contestId);
        }
    }
}