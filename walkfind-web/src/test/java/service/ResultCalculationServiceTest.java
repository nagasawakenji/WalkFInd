package service;

import nagasawakenji.walkfind.domain.dto.CalculationResult;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestResult;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.CalculationStatus;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestResultMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.VoteMapper;
import nagasawakenji.walkfind.service.ResultCalculationService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResultCalculationServiceTest {

    @Mock
    private ContestMapper contestMapper;
    @Mock
    private PhotoMapper photoMapper;
    @Mock
    private ContestResultMapper contestResultMapper;
    @Mock
    private VoteMapper voteMapper;

    @InjectMocks
    private ResultCalculationService resultCalculationService;

    // ----------------------------------------------------------
    // 1. 集計対象が空 → NO_CONTESTS_TO_CALCULATE を返す
    // ----------------------------------------------------------
    @Test
    @DisplayName("calculateAllClosedContests: 集計対象なし → NO_CONTESTS_TO_CALCULATE")
    void testNoContestsToCalculate() {

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of());

        List<CalculationResult> results = resultCalculationService.calculateAllClosedContests();

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStatus())
                .isEqualTo(CalculationStatus.NO_CONTESTS_TO_CALCULATE);
    }

    // ----------------------------------------------------------
    // 2. 投稿が0件 → status 更新のみ
    // ----------------------------------------------------------
    @Test
    @DisplayName("投稿0件 → 結果なし、ステータス更新のみ")
    void testZeroSubmissions() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of(contest));

        when(photoMapper.findAllSubmissionsForCalculation(1L))
                .thenReturn(List.of());

        List<CalculationResult> results = resultCalculationService.calculateAllClosedContests();

        assertThat(results.get(0).getStatus()).isEqualTo(CalculationStatus.SUCCESS);
        assertThat(results.get(0).getPhotosProcessed()).isEqualTo(0);

        verify(contestMapper, times(1))
                .updateContestStatus(1L, ContestStatus.ANNOUNCED);
        verify(contestResultMapper, never()).insertAll(any());
    }

    // ----------------------------------------------------------
    // 3. 正常集計 → 順位付け + DB書き込み + ステータス更新
    // ----------------------------------------------------------
    @Test
    @DisplayName("正常集計 → 順位付け + insertAll + status 更新")
    void testNormalCalculation() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.CLOSED_VOTING);

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of(contest));

        // 投稿データ（順位付け確認用）
        UserPhoto p1 = new UserPhoto();
        p1.setId(10L);
        p1.setTotalVotes(10);
        p1.setSubmissionDate(OffsetDateTime.parse("2025-01-01T00:00:00Z"));

        UserPhoto p2 = new UserPhoto();
        p2.setId(11L);
        p2.setTotalVotes(20);
        p2.setSubmissionDate(OffsetDateTime.parse("2025-01-02T00:00:00Z"));

        when(photoMapper.findAllSubmissionsForCalculation(1L))
                .thenReturn(new ArrayList<>(List.of(p1, p2)));

        // insertAll は 2件成功したとする
        when(contestResultMapper.insertAll(any()))
                .thenReturn(2);

        List<CalculationResult> results =
                resultCalculationService.calculateAllClosedContests();

        CalculationResult r = results.get(0);
        assertThat(r.getStatus()).isEqualTo(CalculationStatus.SUCCESS);
        assertThat(r.getPhotosProcessed()).isEqualTo(2);

        verify(contestResultMapper, times(1)).insertAll(any());
        verify(contestMapper, times(1))
                .updateContestStatus(1L, ContestStatus.ANNOUNCED);
    }

    // ----------------------------------------------------------
    // 4. 既に集計済み（CLOSED_VOTING / ANNOUNCED）
    // ----------------------------------------------------------
    @Test
    @DisplayName("既に集計済み → ALREADY_CALCULATED")
    void testAlreadyCalculated() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.ANNOUNCED);

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of(contest));

        List<CalculationResult> results =
                resultCalculationService.calculateAllClosedContests();

        assertThat(results.get(0).getStatus())
                .isEqualTo(CalculationStatus.ALREADY_CALCULATED);

        verify(photoMapper, never()).findAllSubmissionsForCalculation(any());
        verify(contestResultMapper, never()).insertAll(any());
    }

    // ----------------------------------------------------------
    // 5. insertAll が結果件数と一致しない → DatabaseOperationException
    // ----------------------------------------------------------
    @Test
    @DisplayName("insertAll が不足 → DatabaseOperationException")
    void testInsertAllMismatch() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of(contest));

        UserPhoto p1 = new UserPhoto();
        p1.setId(10L);
        p1.setTotalVotes(5);

        when(photoMapper.findAllSubmissionsForCalculation(1L))
                .thenReturn(new ArrayList<>(List.of(p1)));

        // 1件のはずが 0 件しか insert されない
        when(contestResultMapper.insertAll(any()))
                .thenReturn(0);

        assertThatThrownBy(() ->
                resultCalculationService.calculateAllClosedContests()
        ).isInstanceOf(DatabaseOperationException.class);
    }

    // ----------------------------------------------------------
    // 6. 途中で例外 → RuntimeException にラップして再throw
    // ----------------------------------------------------------
    @Test
    @DisplayName("途中で予期せぬ例外 → RuntimeException")
    void testUnexpectedException() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestsNeedingCalculation())
                .thenReturn(List.of(contest));

        when(photoMapper.findAllSubmissionsForCalculation(1L))
                .thenThrow(new RuntimeException("DB failure"));

        assertThatThrownBy(() ->
                resultCalculationService.calculateAllClosedContests()
        )
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Unexpected error");
    }
}