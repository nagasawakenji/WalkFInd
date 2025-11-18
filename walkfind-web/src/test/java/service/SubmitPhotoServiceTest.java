package service;

import nagasawakenji.walkfind.domain.dto.SubmitPhotoRequest;
import nagasawakenji.walkfind.domain.dto.SubmitPhotoResult;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.SubmitPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.service.PhotoSubmissionService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoSubmissionServiceTest {

    @Mock
    private PhotoMapper photoMapper;

    @Mock
    private ContestMapper contestMapper;

    @InjectMocks
    private PhotoSubmissionService photoSubmissionService;

    // -----------------------------
    // 正常系: 投稿成功
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: 正常に投稿成功")
    void testSubmitPhotoSuccess() {

        // Contest 準備
        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(contest));

        when(photoMapper.findByContestAndUser(1L, "userId"))
                .thenReturn(Optional.empty());

        // insert 成功
        when(photoMapper.insert(any(UserPhoto.class)))
                .thenReturn(1);

        SubmitPhotoRequest request =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        SubmitPhotoResult result =
                photoSubmissionService.submitPhoto(request, "userId");

        assertThat(result.getStatus()).isEqualTo(SubmitPhotoStatus.SUCCESS);

        verify(contestMapper, times(1)).findContestStatus(1L);
        verify(photoMapper, times(1)).findByContestAndUser(1L, "userId");
        verify(photoMapper, times(1)).insert(any(UserPhoto.class));
    }

    // -----------------------------
    // 異常: Contest が存在しない
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: Contest が見つからない → BUSINESS_RULE_VIOLATION")
    void testContestNotFound() {

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.empty());

        SubmitPhotoRequest req =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        SubmitPhotoResult result =
                photoSubmissionService.submitPhoto(req, "userA");

        assertThat(result.getStatus())
                .isEqualTo(SubmitPhotoStatus.BUSINESS_RULE_VIOLATION);

        verify(contestMapper, times(1)).findContestStatus(1L);
        verify(photoMapper, never()).findByContestAndUser(any(), any());
    }

    // -----------------------------
    // 異常: コンテスト期間外
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: Contest が IN_PROGRESS でない → BUSINESS_RULE_VIOLATION")
    void testContestNotInProgress() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.ANNOUNCED);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(contest));

        SubmitPhotoRequest req =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        SubmitPhotoResult result =
                photoSubmissionService.submitPhoto(req, "userA");

        assertThat(result.getStatus())
                .isEqualTo(SubmitPhotoStatus.BUSINESS_RULE_VIOLATION);

        verify(contestMapper, times(1)).findContestStatus(1L);
        verify(photoMapper, never()).findByContestAndUser(any(), any());
    }

    // -----------------------------
    // 異常: 同じユーザーが既に投稿済み
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: ユーザーがすでに投稿済み → BUSINESS_RULE_VIOLATION")
    void testAlreadySubmitted() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(contest));

        when(photoMapper.findByContestAndUser(1L, "userA"))
                .thenReturn(Optional.of(new UserPhoto()));

        SubmitPhotoRequest req =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        SubmitPhotoResult result =
                photoSubmissionService.submitPhoto(req, "userA");

        assertThat(result.getStatus())
                .isEqualTo(SubmitPhotoStatus.BUSINESS_RULE_VIOLATION);

        verify(contestMapper, times(1)).findContestStatus(1L);
        verify(photoMapper, times(1)).findByContestAndUser(1L, "userA");
        verify(photoMapper, never()).insert(any());
    }

    // -----------------------------
    // 異常: insert が 0 → DatabaseOperationException
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: insert が 0 → DatabaseOperationException")
    void testInsertFailed() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(contest));

        when(photoMapper.findByContestAndUser(1L, "userA"))
                .thenReturn(Optional.empty());

        when(photoMapper.insert(any(UserPhoto.class)))
                .thenReturn(0);

        SubmitPhotoRequest req =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        assertThatThrownBy(() ->
                photoSubmissionService.submitPhoto(req, "userA")
        )
                .isInstanceOf(DatabaseOperationException.class);

        verify(photoMapper, times(1)).insert(any());
    }

    // -----------------------------
    // 異常: insert 中に予期せぬ Exception → RuntimeException
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: insert 中の予期せぬ例外 → RuntimeException")
    void testUnexpectedDbException() {

        Contest contest = new Contest();
        contest.setId(1L);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(1L))
                .thenReturn(Optional.of(contest));

        when(photoMapper.findByContestAndUser(1L, "userA"))
                .thenReturn(Optional.empty());

        // insert が SQL 例外を throw
        when(photoMapper.insert(any(UserPhoto.class)))
                .thenThrow(new RuntimeException("SQL error"));

        SubmitPhotoRequest req =
                new SubmitPhotoRequest(1L, "url", "title", "desc");

        assertThatThrownBy(() ->
                photoSubmissionService.submitPhoto(req, "userA")
        )
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("予期せぬエラー");

        verify(photoMapper, times(1)).insert(any());
    }
}