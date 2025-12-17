package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.ContestDetailResponse;
import nagasawakenji.walkfind.domain.dto.ContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestService {

    private final ContestMapper contestMapper;

    /**
     * すべてのアクティブなコンテスト（開催前、開催中、結果発表前）をリストで取得します。
     */
    @Transactional(readOnly = true)
    public List<ContestResponse> getAllActiveContests() {
        log.info("DEBUG: Checking Contest Status Mapping - 修正を適用しました");


        List<Contest> contests = contestMapper.findAllActiveContests();
        log.info("Found {} active contests.", contests.size());

        // Modelから一覧表示用DTOへの変換
        return contests.stream()
                .map(this::mapToContestResponse)
                .collect(Collectors.toList());
    }

    /**
     * 結果発表済みのコンテストを取得します
     */
    @Transactional(readOnly = true)
    public List<ContestResponse> getAnnouncedContests(int page, int size) {
        List<Contest> contests = contestMapper.findAnnouncedContest(page, size);

        // Modelから一覧表示用DTOへの変換
        return contests.stream()
                .map(this::mapToContestResponse)
                .collect(Collectors.toList());
    }

    /**
     * 特定のコンテスト詳細を取得します。
     */
    @Transactional(readOnly = true)
    public ContestDetailResponse getContestDetail(Long contestId) {

        Contest contest = contestMapper.findById(contestId)
                .orElseThrow(() -> new ContestNotFoundException("Contest ID " + contestId + " not found.", "NOT_FOUND"));

        // Modelから詳細表示用DTOへの変換
        return mapToContestDetailResponse(contest);
    }

    // --- 内部ヘルパーメソッド ---

    private ContestResponse mapToContestResponse(Contest contest) {
        return ContestResponse.builder()
                .contestId(contest.getId())
                .name(contest.getName())
                .theme(contest.getTheme())
                .status(contest.getStatus())
                .startDate(contest.getStartDate())
                .endDate(contest.getEndDate())
                .build();
    }

    private ContestDetailResponse mapToContestDetailResponse(Contest contest) {
        // ContestResponseと同じ情報だが、将来の拡張のためにDTOを分けている
        return ContestDetailResponse.builder()
                .contestId(contest.getId())
                .name(contest.getName())
                .theme(contest.getTheme())
                .status(contest.getStatus())
                .startDate(contest.getStartDate())
                .endDate(contest.getEndDate())
                .build();
    }
}