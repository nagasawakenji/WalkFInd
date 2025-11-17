package service;

import nagasawakenji.walkfind.domain.dto.*;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestModelPhoto;
import nagasawakenji.walkfind.domain.statusenum.ModelPhotoStatus;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoMapper;
import nagasawakenji.walkfind.service.ContestModelPhotoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ContestModelPhotoServiceTest {

    @Mock
    private ContestMapper contestMapper;

    @Mock
    private ContestModelPhotoMapper contestModelPhotoMapper;

    @InjectMocks
    private ContestModelPhotoService contestModelPhotoService;

    // --------------------------
    // addModelPhoto()
    // --------------------------

    @Test
    @DisplayName("addModelPhoto: コンテストが存在しない → FAILED を返す")
    void testAddModelPhotoContestNotFound() {
        Long contestId = 1L;

        when(contestMapper.findById(contestId)).thenReturn(Optional.empty());

        ModelPhotoCreateRequest req = new ModelPhotoCreateRequest(
                "https://example.com/photo.jpg", // photoUrl
                "Title",                        // title
                "Desc"                          // description
        );

        ModelPhotoCreateResponse res = contestModelPhotoService.addModelPhoto(contestId, req);

        assertThat(res.getStatus()).isEqualTo(ModelPhotoStatus.FAILED);
        assertThat(res.getMessage()).isEqualTo("指定されたコンテストが存在しません");
    }

    @Test
    @DisplayName("addModelPhoto: 正常系 → SUCCESS を返す")
    void testAddModelPhotoSuccess() {
        Long contestId = 1L;

        // Contest が存在する
        Contest contest = new Contest();
        contest.setId(contestId);
        when(contestMapper.findById(contestId)).thenReturn(Optional.of(contest));

        // insert 成功
        when(contestModelPhotoMapper.insert(any())).thenAnswer(invocation -> {
            ContestModelPhoto p = invocation.getArgument(0);
            p.setId(10L);   // DB が発行したと仮定
            return 1;
        });

        ModelPhotoCreateRequest req =
                new ModelPhotoCreateRequest(
                        "https://example.com/photo.jpg", // photoUrl
                        "Title",                        // title
                        "Desc"                          // description
                );

        ModelPhotoCreateResponse res = contestModelPhotoService.addModelPhoto(contestId, req);

        assertThat(res.getStatus()).isEqualTo(ModelPhotoStatus.SUCCESS);
        assertThat(res.getModelPhotoId()).isEqualTo(10L);
        assertThat(res.getTitle()).isEqualTo("Title");
    }

    // --------------------------
    // getModelPhotos()
    // --------------------------

    @Test
    @DisplayName("getModelPhotos: contestId に紐づく写真一覧を返す")
    void testGetModelPhotos() {

        ContestModelPhoto contestModelPhoto1 = new ContestModelPhoto();
        contestModelPhoto1.setId(1L);
        contestModelPhoto1.setContestId(1L);
        contestModelPhoto1.setPhotoUrl("url1");
        contestModelPhoto1.setTitle("t1");
        contestModelPhoto1.setCreatedAt(OffsetDateTime.now());

        ContestModelPhoto contestModelPhoto2 = new ContestModelPhoto();
        contestModelPhoto2.setId(2L);
        contestModelPhoto2.setContestId(2L);
        contestModelPhoto2.setPhotoUrl("url2");
        contestModelPhoto2.setTitle("t2");


        List<ContestModelPhoto> list = List.of(
               contestModelPhoto1,
                contestModelPhoto2
        );

        when(contestModelPhotoMapper.findByContestId(1L)).thenReturn(list);

        List<ModelPhotoResponse> res = contestModelPhotoService.getModelPhotos(1L);

        assertThat(res).hasSize(2);
        assertThat(res.get(0).getTitle()).isEqualTo("t1");
        assertThat(res.get(1).getPhotoUrl()).isEqualTo("url2");
    }

    // --------------------------
    // deleteModelPhoto()
    // --------------------------

    @Test
    @DisplayName("deleteModelPhoto: 削除対象が存在しない → FAILED")
    void testDeleteModelPhotoNotFound() {

        when(contestModelPhotoMapper.deleteById(999L)).thenReturn(0);

        ModelPhotoDeleteResponse res = contestModelPhotoService.deleteModelPhoto(999L);

        assertThat(res.getStatus()).isEqualTo(ModelPhotoStatus.FAILED);
        assertThat(res.getMessage()).isEqualTo("指定されたモデル写真は存在しません");
    }

    @Test
    @DisplayName("deleteModelPhoto: 正常削除 → SUCCESS")
    void testDeleteModelPhotoSuccess() {

        when(contestModelPhotoMapper.deleteById(10L)).thenReturn(1);

        ModelPhotoDeleteResponse res = contestModelPhotoService.deleteModelPhoto(10L);

        assertThat(res.getStatus()).isEqualTo(ModelPhotoStatus.SUCCESS);
        assertThat(res.getDeletedPhotoId()).isEqualTo(10L);
    }
}