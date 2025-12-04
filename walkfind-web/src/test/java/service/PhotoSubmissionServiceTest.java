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
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper;
import nagasawakenji.walkfind.service.UserProfileContestEntryService;
import nagasawakenji.walkfind.service.LocalPhotoSubmissionService;
import nagasawakenji.walkfind.service.LocalStorageUploadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoSubmissionServiceTest {

    @Mock
    private PhotoMapper photoMapper;

    @Mock
    private ContestMapper contestMapper;

    @Mock
    private LocalStorageUploadService localStorageUploadService; // 追加

    @Mock
    private MultipartFile mockFile; // 追加

    @Mock
    private UserProfileMapper userProfileMapper;

    @Mock
    private UserProfileContestEntryService userProfileContestEntryService;

    @InjectMocks
    private LocalPhotoSubmissionService localPhotoSubmissionService;

    // -----------------------------
    // 正常系: 投稿成功
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: 正常に投稿成功")
    void testSubmitPhotoSuccess() {
        // Setup
        Long contestId = 1L;
        String userId = "userA";
        String savedPath = "contest-1/uuid.jpg";

        // Contest
        Contest contest = new Contest();
        contest.setId(contestId);
        contest.setStatus(ContestStatus.IN_PROGRESS);
        when(contestMapper.findContestStatus(contestId)).thenReturn(Optional.of(contest));

        // 重複チェック
        when(photoMapper.findByContestAndUser(contestId, userId)).thenReturn(Optional.empty());

        // File Mock
        when(mockFile.getOriginalFilename()).thenReturn("test.jpg");
        // Storage保存成功
        when(localStorageUploadService.saveFile(eq(mockFile), any(String.class)))
                .thenReturn(savedPath);

        // DB insert 成功
        when(photoMapper.insert(any(UserPhoto.class))).thenReturn(1);
        when(userProfileMapper.incrementTotalPosts(userId)).thenReturn(1);

        // Request (URLなし)
        SubmitPhotoRequest req = new SubmitPhotoRequest(contestId, "title", "url", "desc");

        // Execute
        SubmitPhotoResult result = localPhotoSubmissionService.submitPhoto(req, userId, mockFile);

        // Verify
        assertThat(result.getStatus()).isEqualTo(SubmitPhotoStatus.SUCCESS);

        verify(localStorageUploadService, times(1)).saveFile(eq(mockFile), anyString());
        verify(photoMapper, times(1)).insert(any(UserPhoto.class));
        verify(userProfileMapper, times(1)).incrementTotalPosts(userId);
        verify(userProfileContestEntryService, times(1))
                .incrementIfFirstEntry(userId, contestId);
        verify(userProfileMapper, times(1)).incrementTotalPosts(userId);

        // ★重要: 成功時は削除メソッドが呼ばれていないことを確認
        verify(localStorageUploadService, never()).deleteFile(anyString());
    }

    // -----------------------------
    // 異常: Contest が存在しない (Storage保存前)
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: バリデーションエラー時はストレージ保存を実行しない")
    void testContestNotFound() {
        Long contestId = 1L;
        when(contestMapper.findContestStatus(contestId)).thenReturn(Optional.empty());

        SubmitPhotoRequest req = new SubmitPhotoRequest(contestId, "title", "url", "desc");

        SubmitPhotoResult result = localPhotoSubmissionService.submitPhoto(req, "userA", mockFile);

        assertThat(result.getStatus()).isEqualTo(SubmitPhotoStatus.BUSINESS_RULE_VIOLATION);

        // ★重要: バリデーションで弾かれた場合、ファイル保存処理が走らないこと
        verify(localStorageUploadService, never()).saveFile(any(), any());
    }

    // -----------------------------
    // 異常: ストレージ保存失敗
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: ストレージ保存失敗時は RuntimeException")
    void testStorageSaveFailed() {
        Long contestId = 1L;
        Contest contest = new Contest();
        contest.setId(contestId);
        contest.setStatus(ContestStatus.IN_PROGRESS);

        when(contestMapper.findContestStatus(contestId)).thenReturn(Optional.of(contest));
        when(photoMapper.findByContestAndUser(contestId, "userA")).thenReturn(Optional.empty());

        // File Name
        when(mockFile.getOriginalFilename()).thenReturn("test.jpg");

        // ★保存時に例外発生
        when(localStorageUploadService.saveFile(any(), any()))
                .thenThrow(new RuntimeException("Disk full"));

        SubmitPhotoRequest req = new SubmitPhotoRequest(contestId, "title", "url", "desc");

        assertThatThrownBy(() -> localPhotoSubmissionService.submitPhoto(req, "userA", mockFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("写真の保存に失敗しました");

        // DBには行かないこと
        verify(photoMapper, never()).insert(any());
        verify(userProfileMapper, never()).incrementTotalPosts(anyString());
        verify(userProfileContestEntryService, never())
                .incrementIfFirstEntry(anyString(), anyLong());
    }

    // -----------------------------
    // 異常: DB insert 失敗 (0件) -> ファイル削除 (ロールバック)
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: DB保存失敗時はファイルを削除して DatabaseOperationException")
    void testInsertFailed_ShouldRollbackFile() {
        // Setup
        Long contestId = 1L;
        String savedPath = "contest-1/failed.jpg";

        Contest contest = new Contest();
        contest.setId(contestId);
        contest.setStatus(ContestStatus.IN_PROGRESS);
        when(contestMapper.findContestStatus(contestId)).thenReturn(Optional.of(contest));
        when(photoMapper.findByContestAndUser(contestId, "userA")).thenReturn(Optional.empty());

        when(mockFile.getOriginalFilename()).thenReturn("test.jpg");
        when(localStorageUploadService.saveFile(any(), any())).thenReturn(savedPath);

        // ★DB Insertが0件（失敗）
        when(photoMapper.insert(any(UserPhoto.class))).thenReturn(0);

        SubmitPhotoRequest req = new SubmitPhotoRequest(contestId, "title", "url", "desc");

        assertThatThrownBy(() -> localPhotoSubmissionService.submitPhoto(req, "userA", mockFile))
                .isInstanceOf(DatabaseOperationException.class);

        // ★最重要: ファイルの削除メソッドが、保存されたパスを引数に呼ばれたか検証
        verify(localStorageUploadService, times(1)).deleteFile(savedPath);
        verify(userProfileMapper, never()).incrementTotalPosts(anyString());
        verify(userProfileContestEntryService, never())
                .incrementIfFirstEntry(anyString(), anyLong());
    }

    // -----------------------------
    // 異常: DB 予期せぬ例外 -> ファイル削除 (ロールバック)
    // -----------------------------
    @Test
    @DisplayName("submitPhoto: DB予期せぬエラー時もファイルを削除する")
    void testUnexpectedDbException_ShouldRollbackFile() {
        // Setup
        Long contestId = 1L;
        String savedPath = "contest-1/error.jpg";

        Contest contest = new Contest();
        contest.setId(contestId);
        contest.setStatus(ContestStatus.IN_PROGRESS);
        when(contestMapper.findContestStatus(contestId)).thenReturn(Optional.of(contest));
        when(photoMapper.findByContestAndUser(contestId, "userA")).thenReturn(Optional.empty());

        when(mockFile.getOriginalFilename()).thenReturn("test.jpg");
        when(localStorageUploadService.saveFile(any(), any())).thenReturn(savedPath);

        // ★DB Insertで予期せぬ例外
        when(photoMapper.insert(any(UserPhoto.class)))
                .thenThrow(new RuntimeException("SQL Connection Error"));

        SubmitPhotoRequest req = new SubmitPhotoRequest(contestId, "title", "url", "desc");

        assertThatThrownBy(() -> localPhotoSubmissionService.submitPhoto(req, "userA", mockFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("予期せぬエラー");

        // ★最重要: 例外の種類に関わらず、ファイル削除が呼ばれていること
        verify(localStorageUploadService, times(1)).deleteFile(savedPath);
        verify(userProfileMapper, never()).incrementTotalPosts(anyString());
        verify(userProfileContestEntryService, never())
                .incrementIfFirstEntry(anyString(), anyLong());
    }
}