package service;

import nagasawakenji.walkfind.domain.dto.ContestResultResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import nagasawakenji.walkfind.exception.ContestStatusException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestResultMapper;
import nagasawakenji.walkfind.service.ResultDisplayService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResultDisplayServiceTest {

    @Mock
    private ContestMapper contestMapper;

    @Mock
    private ContestResultMapper contestResultMapper;

    @InjectMocks
    private ResultDisplayService resultDisplayService;

    // ---------------------------------------------------------------
    // 1. コンテストが存在しない → ContestNotFoundException
    // ---------------------------------------------------------------
    @Test
    @DisplayName("コンテストが存在しない場合 → ContestNotFoundException")
    void testContestNotFound() {

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                resultDisplayService.getFinalResults(1L)
        ).isInstanceOf(ContestNotFoundException.class);
    }

    // ---------------------------------------------------------------
    // 2. ステータスが IN_PROGRESS → ContestStatusException
    // ---------------------------------------------------------------
    @Test
    @DisplayName("集計が完了していない状態 → ContestStatusException")
    void testContestStatusNotReady() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.IN_PROGRESS);
        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        assertThatThrownBy(() ->
                resultDisplayService.getFinalResults(1L)
        ).isInstanceOf(ContestStatusException.class);

        verify(contestResultMapper, never())
                .findDetailedResultsByContestId(anyLong());
    }

    // ---------------------------------------------------------------
    // 3. ステータスが CLOSED_VOTING → 結果返却
    // ---------------------------------------------------------------
    @Test
    @DisplayName("CLOSED_VOTING → 結果返却")
    void testClosedVotingStatusReturnsResults() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.CLOSED_VOTING);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        ContestResultResponse r1 = ContestResultResponse.builder()
                .photoId(20L)
                .contestId(2L)
                .finalRank(1)
                .finalScore(15)
                .isWinner(true)
                .photoUrl("photo-url")
                .title("testPhoto")
                .build();

        when(contestResultMapper.findDetailedResultsByContestId(1L))
                .thenReturn(List.of(r1));

        List<ContestResultResponse> results = resultDisplayService.getFinalResults(1L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getFinalRank()).isEqualTo(1);
        assertThat(results.get(0).getIsWinner()).isTrue();

        verify(contestResultMapper, times(1))
                .findDetailedResultsByContestId(1L);
    }

    // ---------------------------------------------------------------
    // 4. ステータスが ANNOUNCED → 結果返却
    // ---------------------------------------------------------------
    @Test
    @DisplayName("ANNOUNCED → 結果返却")
    void testAnnouncedStatusReturnsResults() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.ANNOUNCED);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        ContestResultResponse r1 = ContestResultResponse.builder()
                .photoId(20L)
                .contestId(2L)
                .finalRank(80)
                .finalScore(15)
                .isWinner(false)
                .photoUrl("photo-url")
                .title("testPhoto")
                .build();

        when(contestResultMapper.findDetailedResultsByContestId(1L))
                .thenReturn(List.of(r1));

        List<ContestResultResponse> results = resultDisplayService.getFinalResults(1L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getFinalScore()).isEqualTo(15);

        verify(contestResultMapper, times(1))
                .findDetailedResultsByContestId(1L);
    }

    // ---------------------------------------------------------------
    // 5. 結果が空 → 空リスト返却（例外なし）
    // ---------------------------------------------------------------
    @Test
    @DisplayName("結果テーブルが空 → 空リスト返却（例外なし）")
    void testEmptyResultsButStatusValid() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.CLOSED_VOTING);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        when(contestResultMapper.findDetailedResultsByContestId(1L))
                .thenReturn(List.of());

        List<ContestResultResponse> results = resultDisplayService.getFinalResults(1L);

        assertThat(results).isEmpty();
    }
}