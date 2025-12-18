package service;

import nagasawakenji.walkfind.domain.dto.ContestModelPhotoCreateRequest;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoListResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestModelPhoto;
import nagasawakenji.walkfind.domain.statusenum.ContestModelPhotoCreateStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoMapper;
import nagasawakenji.walkfind.service.ContestModelPhotoService;
import nagasawakenji.walkfind.service.LocalStorageUploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContestModelPhotoService（見本写真登録）: 認可・補償トランザクション・CRUDの振る舞い")
class ContestModelPhotoServiceTest {

    @Mock ContestMapper contestMapper;
    @Mock ContestModelPhotoMapper contestModelPhotoMapper;
    @Mock LocalStorageUploadService localStorageUploadService;

    ContestModelPhotoService service;

    @BeforeEach
    void setUp() {
        service = new ContestModelPhotoService(contestMapper, contestModelPhotoMapper, localStorageUploadService);
    }

    private MockMultipartFile dummyFile() {
        return new MockMultipartFile(
                "file",
                "test.png",
                MediaType.IMAGE_PNG_VALUE,
                "dummy".getBytes()
        );
    }

    @Test
    @DisplayName("create: reqがnull/必須項目不足なら INVALID_REQUEST を返し、DB/ストレージ操作は一切しない")
    void create_invalidRequest_returnsInvalidRequest_andNoSideEffects() {
        ContestModelPhotoListResponse res = service.create(1L, "user", null, null);

        assertEquals(ContestModelPhotoCreateStatus.INVALID_REQUEST, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verifyNoInteractions(contestMapper, contestModelPhotoMapper, localStorageUploadService);
    }

    @Test
    @DisplayName("create: contestIdが存在しない場合 CONTEST_NOT_FOUND を返し、insertや補償削除は行わない")
    void create_contestNotFound_returnsContestNotFound() {
        when(contestMapper.findById(1L)).thenReturn(Optional.empty());

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("t");
        req.setDescription("d");

        ContestModelPhotoListResponse res = service.create(1L, "user", req, dummyFile());

        assertEquals(ContestModelPhotoCreateStatus.CONTEST_NOT_FOUND, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verify(contestMapper).findById(1L);
        verifyNoInteractions(contestModelPhotoMapper, localStorageUploadService);
    }

    @Test
    @DisplayName("create: 作成者(userId)不一致なら FORBIDDEN を返し、insertや補償削除は行わない")
    void create_forbidden_returnsForbidden() {
        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn("owner");
        when(contestMapper.findById(1L)).thenReturn(Optional.of(contest));

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("t");
        req.setDescription("d");

        ContestModelPhotoListResponse res = service.create(1L, "not-owner", req, dummyFile());

        assertEquals(ContestModelPhotoCreateStatus.FORBIDDEN, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verify(contestMapper).findById(1L);
        verifyNoInteractions(contestModelPhotoMapper, localStorageUploadService);
    }

    @Test
    @DisplayName("create: 正常系 - saveFile→insert→findByIdして1件返却し、補償削除は呼ばれない")
    void create_success_insertsAndReturnsCreatedPhoto_andNoCompensationDelete() {
        long contestId = 1L;
        String owner = "owner";
        long generatedId = 123L;

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        MockMultipartFile file = dummyFile();
        when(localStorageUploadService.saveFile(any(), anyString())).thenReturn("saved-key.png");

        // insert時にuseGeneratedKeys相当でidが採番される想定を模擬
        doAnswer(inv -> {
            ContestModelPhoto arg = inv.getArgument(0);
            arg.setId(generatedId);
            return 1;
        }).when(contestModelPhotoMapper).insert(any(ContestModelPhoto.class));

        ContestModelPhoto created = new ContestModelPhoto();
        created.setId(generatedId);
        created.setContestId(contestId);
        created.setPhotoUrl("saved-key.png");
        created.setTitle("title");
        created.setDescription("desc");
        created.setCreatedAt(OffsetDateTime.now());
        when(contestModelPhotoMapper.findById(generatedId)).thenReturn(created);

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle(created.getTitle());
        req.setDescription(created.getDescription());

        ContestModelPhotoListResponse res = service.create(contestId, owner, req, file);

        assertEquals(ContestModelPhotoCreateStatus.SUCCESS, res.getStatus());
        assertEquals(1, res.getPhotos().size());
        assertEquals(generatedId, res.getPhotos().get(0).getId());
        assertEquals(created.getPhotoUrl(), res.getPhotos().get(0).getKey());

        verify(localStorageUploadService).saveFile(eq(file), anyString());
        verify(contestModelPhotoMapper).insert(any(ContestModelPhoto.class));
        verify(contestModelPhotoMapper).findById(generatedId);
        verify(localStorageUploadService, never()).deleteFile(anyString());
    }

    @Test
    @DisplayName("create: ストレージ保存(saveFile)した戻り値が photoUrl として insert される")
    void create_setsSavedKeyIntoInsertedEntity() {
        long contestId = 1L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        MockMultipartFile file = dummyFile();
        when(localStorageUploadService.saveFile(any(), anyString())).thenReturn("saved-key.png");

        doAnswer(inv -> {
            ContestModelPhoto arg = inv.getArgument(0);
            arg.setId(999L);
            return 1;
        }).when(contestModelPhotoMapper).insert(any(ContestModelPhoto.class));

        ContestModelPhoto created = new ContestModelPhoto();
        created.setId(999L);
        created.setContestId(contestId);
        created.setPhotoUrl("saved-key.png");
        created.setTitle("title");
        created.setCreatedAt(OffsetDateTime.now());
        when(contestModelPhotoMapper.findById(999L)).thenReturn(created);

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("title");
        req.setDescription("desc");

        service.create(contestId, owner, req, file);

        ArgumentCaptor<ContestModelPhoto> captor = ArgumentCaptor.forClass(ContestModelPhoto.class);
        verify(contestModelPhotoMapper).insert(captor.capture());
        assertEquals("saved-key.png", captor.getValue().getPhotoUrl());
    }

    @Test
    @DisplayName("create: ストレージ保存が失敗したら例外を投げ、DB insert には到達しない")
    void create_storageFailure_throws_andDoesNotTouchDb() {
        long contestId = 1L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        MockMultipartFile file = dummyFile();
        doThrow(new RuntimeException("upload failed"))
                .when(localStorageUploadService).saveFile(any(), anyString());

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("title");

        assertThrows(RuntimeException.class, () -> service.create(contestId, owner, req, file));
        verify(contestModelPhotoMapper, never()).insert(any());
        verify(localStorageUploadService, never()).deleteFile(anyString());
    }

    @Test
    @DisplayName("create: DB(insert)で例外→補償としてdeleteFile(savedKey)をベストエフォート実行し、最終的にDatabaseOperationExceptionを投げる")
    void create_dbFailure_triggersBestEffortLocalDelete_thenThrowsDatabaseOperationException() {
        long contestId = 1L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        MockMultipartFile file = dummyFile();
        when(localStorageUploadService.saveFile(any(), anyString())).thenReturn("saved-key.png");

        doThrow(new RuntimeException("db down"))
                .when(contestModelPhotoMapper).insert(any(ContestModelPhoto.class));

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("title");

        DatabaseOperationException ex = assertThrows(
                DatabaseOperationException.class,
                () -> service.create(contestId, owner, req, file)
        );

        assertTrue(ex.getMessage().contains("Failed to create contest model photo"));
        verify(localStorageUploadService).deleteFile("saved-key.png");
    }

    @Test
    @DisplayName("create: DB失敗＋補償削除も失敗しても、補償削除例外は握りつぶしてDatabaseOperationExceptionを優先する")
    void create_dbFailure_andLocalDeleteAlsoFails_stillThrowsDatabaseOperationException_andDeleteIsSwallowed() {
        long contestId = 1L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        MockMultipartFile file = dummyFile();
        when(localStorageUploadService.saveFile(any(), anyString())).thenReturn("saved-key.png");

        doThrow(new RuntimeException("db down"))
                .when(contestModelPhotoMapper).insert(any(ContestModelPhoto.class));

        doThrow(new RuntimeException("delete failed"))
                .when(localStorageUploadService).deleteFile("saved-key.png");

        ContestModelPhotoCreateRequest req = new ContestModelPhotoCreateRequest();
        req.setTitle("title");

        assertThrows(DatabaseOperationException.class, () -> service.create(contestId, owner, req, file));
        verify(localStorageUploadService).deleteFile("saved-key.png");
    }

    @Test
    @DisplayName("list: findByContestIdの結果をDTOに詰め替えてSUCCESSで返す（itemにstatusを持たせない）")
    void list_returnsSuccessAndMapsItems() {
        long contestId = 1L;

        ContestModelPhoto p1 = new ContestModelPhoto();
        p1.setId(1L);
        p1.setContestId(contestId);
        p1.setPhotoUrl("k1");
        p1.setTitle("t1");

        ContestModelPhoto p2 = new ContestModelPhoto();
        p2.setId(2L);
        p2.setContestId(contestId);
        p2.setPhotoUrl("k2");
        p2.setTitle("t2");

        when(contestModelPhotoMapper.findByContestId(contestId)).thenReturn(List.of(p1, p2));

        ContestModelPhotoListResponse res = service.list(contestId);

        assertEquals(ContestModelPhotoCreateStatus.SUCCESS, res.getStatus());
        assertEquals(2, res.getPhotos().size());
        assertEquals("k1", res.getPhotos().get(0).getKey());
        assertEquals("k2", res.getPhotos().get(1).getKey());
    }

    @Test
    @DisplayName("delete: contestIdが存在しない場合 CONTEST_NOT_FOUND を返し、DB削除/ストレージ削除は行わない")
    void delete_contestNotFound_returnsContestNotFound() {
        when(contestMapper.findById(1L)).thenReturn(Optional.empty());

        ContestModelPhotoListResponse res = service.delete(1L, 10L, "user");

        assertEquals(ContestModelPhotoCreateStatus.CONTEST_NOT_FOUND, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verifyNoInteractions(contestModelPhotoMapper, localStorageUploadService);
    }

    @Test
    @DisplayName("delete: 作成者(userId)不一致なら FORBIDDEN を返し、DB削除/ストレージ削除は行わない")
    void delete_forbidden_returnsForbidden() {
        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn("owner");
        when(contestMapper.findById(1L)).thenReturn(Optional.of(contest));

        ContestModelPhotoListResponse res = service.delete(1L, 10L, "not-owner");

        assertEquals(ContestModelPhotoCreateStatus.FORBIDDEN, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verifyNoInteractions(contestModelPhotoMapper, localStorageUploadService);
    }

    @Test
    @DisplayName("delete: 対象写真が存在しない or contestId不一致なら MODEL_PHOTO_NOT_FOUND を返し、DB削除/ストレージ削除は行わない")
    void delete_photoNotFound_returnsModelPhotoNotFound() {
        long contestId = 1L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        when(contestModelPhotoMapper.findById(10L)).thenReturn(null);

        ContestModelPhotoListResponse res = service.delete(contestId, 10L, owner);

        assertEquals(ContestModelPhotoCreateStatus.MODEL_PHOTO_NOT_FOUND, res.getStatus());
        assertTrue(res.getPhotos().isEmpty());

        verify(contestModelPhotoMapper).findById(10L);
        verifyNoInteractions(localStorageUploadService);
    }

    @Test
    @DisplayName("delete: 正常系 - DB削除後にベストエフォートでdeleteFile(key)を呼び、SUCCESSで削除対象を返す")
    void delete_success_deletesDbThenBestEffortLocalDelete() {
        long contestId = 1L;
        long modelPhotoId = 10L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        ContestModelPhoto existing = new ContestModelPhoto();
        existing.setId(modelPhotoId);
        existing.setContestId(contestId);
        existing.setPhotoUrl("k1");
        existing.setTitle("t1");

        when(contestModelPhotoMapper.findById(modelPhotoId)).thenReturn(existing);

        ContestModelPhotoListResponse res = service.delete(contestId, modelPhotoId, owner);

        assertEquals(ContestModelPhotoCreateStatus.SUCCESS, res.getStatus());
        assertEquals(1, res.getPhotos().size());
        assertEquals("k1", res.getPhotos().get(0).getKey());

        verify(contestModelPhotoMapper).deleteById(modelPhotoId);
        verify(localStorageUploadService).deleteFile("k1");
    }

    @Test
    @DisplayName("delete: ローカル削除(deleteFile)が失敗しても握りつぶし、DB削除を成功扱い(SUCCESS)で返す")
    void delete_success_evenIfLocalDeleteFails_isSwallowed() {
        long contestId = 1L;
        long modelPhotoId = 10L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        ContestModelPhoto existing = new ContestModelPhoto();
        existing.setId(modelPhotoId);
        existing.setContestId(contestId);
        existing.setPhotoUrl("k1");
        existing.setTitle("t1");

        when(contestModelPhotoMapper.findById(modelPhotoId)).thenReturn(existing);

        doThrow(new RuntimeException("delete failed"))
                .when(localStorageUploadService).deleteFile("k1");

        ContestModelPhotoListResponse res = service.delete(contestId, modelPhotoId, owner);

        assertEquals(ContestModelPhotoCreateStatus.SUCCESS, res.getStatus());
        verify(contestModelPhotoMapper).deleteById(modelPhotoId);
        verify(localStorageUploadService).deleteFile("k1");
    }

    @Test
    @DisplayName("delete: DB削除(deleteById)で例外→DatabaseOperationExceptionを投げ、ローカル削除(deleteFile)には到達しない")
    void delete_dbFailure_throwsDatabaseOperationException_andDoesNotCallLocalDelete() {
        long contestId = 1L;
        long modelPhotoId = 10L;
        String owner = "owner";

        Contest contest = mock(Contest.class);
        when(contest.getCreatedByUserId()).thenReturn(owner);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        ContestModelPhoto existing = new ContestModelPhoto();
        existing.setId(modelPhotoId);
        existing.setContestId(contestId);
        existing.setPhotoUrl("k1");
        existing.setTitle("t1");

        when(contestModelPhotoMapper.findById(modelPhotoId)).thenReturn(existing);

        doThrow(new RuntimeException("db err"))
                .when(contestModelPhotoMapper).deleteById(modelPhotoId);

        assertThrows(DatabaseOperationException.class,
                () -> service.delete(contestId, modelPhotoId, owner));

        verify(localStorageUploadService, never()).deleteFile(anyString());
    }
}