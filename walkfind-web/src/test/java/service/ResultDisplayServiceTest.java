package service;

import nagasawakenji.walkfind.domain.dto.ContestResultResponse;
import nagasawakenji.walkfind.domain.dto.ContestResultListResponse;
import nagasawakenji.walkfind.domain.dto.ContestWinnerDto;
import nagasawakenji.walkfind.domain.dto.ContestWinnerListResponse;
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
                resultDisplayService.getFinalResults(1L, 0, 20)
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
                resultDisplayService.getFinalResults(1L, 0, 20)
        ).isInstanceOf(ContestStatusException.class);

        verify(contestResultMapper, never())
                .findDetailedResultsByContestId(anyLong(), anyInt(), anyInt());
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

        when(contestResultMapper.findDetailedResultsByContestId(1L, 0, 20))
                .thenReturn(List.of(r1));
        when(contestResultMapper.countResultsByContestId(1L)).thenReturn(1);

        ContestResultListResponse response = resultDisplayService.getFinalResults(1L, 0, 20);

        assertThat(response.getContestResultResponses()).hasSize(1);
        assertThat(response.getContestResultResponses().get(0).getFinalRank()).isEqualTo(1);
        assertThat(response.getContestResultResponses().get(0).getIsWinner()).isTrue();
        assertThat(response.getTotalCount()).isEqualTo(1);

        verify(contestResultMapper, times(1))
                .findDetailedResultsByContestId(1L, 0, 20);
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

        when(contestResultMapper.findDetailedResultsByContestId(1L, 0, 20))
                .thenReturn(List.of(r1));
        when(contestResultMapper.countResultsByContestId(1L)).thenReturn(1);

        ContestResultListResponse response = resultDisplayService.getFinalResults(1L, 0, 20);

        assertThat(response.getContestResultResponses()).hasSize(1);
        assertThat(response.getContestResultResponses().get(0).getFinalScore()).isEqualTo(15);
        assertThat(response.getTotalCount()).isEqualTo(1);

        verify(contestResultMapper, times(1))
                .findDetailedResultsByContestId(1L, 0, 20);
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

        when(contestResultMapper.findDetailedResultsByContestId(1L, 0, 20))
                .thenReturn(List.of());
        when(contestResultMapper.countResultsByContestId(1L)).thenReturn(0);

        ContestResultListResponse response = resultDisplayService.getFinalResults(1L, 0, 20);

        assertThat(response.getContestResultResponses()).isEmpty();
        assertThat(response.getTotalCount()).isEqualTo(0);
    }

    // ---------------------------------------------------------------
    // 6. Winner取得：CLOSED_VOTING → Winner返却
    // ---------------------------------------------------------------
    @Test
    @DisplayName("CLOSED_VOTING → Winner取得成功")
    void testGetFinalWinnersClosedVoting() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.CLOSED_VOTING);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        ContestWinnerDto winner = ContestWinnerDto.builder()
                .photoId(100L)
                .contestId(1L)
                .finalScore(50)
                .title("winner-photo")
                .photoUrl("winner-url")
                .username("winner-user")
                .build();

        when(contestResultMapper.findWinnerPhotosByContestId(1L))
                .thenReturn(List.of(winner));

        ContestWinnerListResponse response = resultDisplayService.getFinalWinners(1L);

        assertThat(response.getWinners()).hasSize(1);
        assertThat(response.getWinners().get(0).getUsername()).isEqualTo("winner-user");
        assertThat(response.getTotalWinnerCount()).isEqualTo(1);

        verify(contestResultMapper, times(1))
                .findWinnerPhotosByContestId(1L);
    }

    // ---------------------------------------------------------------
    // 7. Winner取得：ステータス不正 → ContestStatusException
    // ---------------------------------------------------------------
    @Test
    @DisplayName("IN_PROGRESS → Winner取得不可")
    void testGetFinalWinnersNotReady() {

        Contest testContest = new Contest();
        testContest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(testContest));

        assertThatThrownBy(() ->
                resultDisplayService.getFinalWinners(1L)
        ).isInstanceOf(ContestStatusException.class);

        verify(contestResultMapper, never())
                .findWinnerPhotosByContestId(anyLong());
    }

    // ---------------------------------------------------------------
    // 8. Winner取得：コンテスト不存在 → ContestNotFoundException
    // ---------------------------------------------------------------
    @Test
    @DisplayName("Winner取得：コンテスト不存在 → ContestNotFoundException")
    void testGetFinalWinnersContestNotFound() {

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                resultDisplayService.getFinalWinners(1L)
        ).isInstanceOf(ContestNotFoundException.class);

        verify(contestResultMapper, never())
                .findWinnerPhotosByContestId(anyLong());
    }
}