package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.MyContestResponse;
import nagasawakenji.walkfind.domain.dto.MyUpcomingContestsPageResponse;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MyUpcomingContestsService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final ContestMapper contestMapper;

    public MyUpcomingContestsPageResponse getMyUpcomingContests(String userId, int page, int size) {
        int safePage = Math.max(page, 0);

        int safeSize = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);

        long offsetLong = (long) safePage * (long) safeSize;
        int offset = offsetLong > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) offsetLong;

        List<MyContestResponse> contests =
                contestMapper.findMyUpcomingContests(userId, safeSize, offset);

        long totalCount = contestMapper.countMyUpcomingContests(userId);

        return new MyUpcomingContestsPageResponse(contests, totalCount, safePage, safeSize);
    }
}