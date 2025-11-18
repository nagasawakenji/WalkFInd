package service;

import nagasawakenji.walkfind.domain.dto.PhotoResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.exception.ContestNotFoundException;

import nagasawakenji.walkfind.service.PhotoDisplayService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoDisplayServiceTest {

    @Mock
    private PhotoMapper photoMapper;

    @Mock
    private ContestMapper contestMapper;

    @InjectMocks
    private PhotoDisplayService photoDisplayService;

    // -----------------------------------------
    // 1. Contest が存在しないとき例外を throw
    // -----------------------------------------
    @Test
    @DisplayName("getPhotosByContest: Contest が存在しない → ContestNotFoundException を throw")
    void testContestNotFound() {

        when(contestMapper.findById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                photoDisplayService.getPhotosByContest(100L)
        )
                .isInstanceOf(ContestNotFoundException.class)
                .hasMessageContaining("not found");

        verify(contestMapper, times(1)).findById(100L);
        verify(photoMapper, never()).findAllPhotosByContest(any());
    }

    // -----------------------------------------
    // 2. Contest が存在し、写真を返す正常系
    // -----------------------------------------
    @Test
    @DisplayName("getPhotosByContest: Contest が存在 → PhotoResponse のリストを返す")
    void testGetPhotosSuccess() {

        // Contest が存在する
        when(contestMapper.findById(1L)).thenReturn(Optional.of(new Contest()));

        // Mapper の返り値を作成
        PhotoResponse p1 = new PhotoResponse();
        p1.setPhotoId(10L);
        p1.setTitle("t1");
        p1.setUsername("user1");
        p1.setPhotoUrl("url1");
        p1.setTotalVotes(5);
        p1.setSubmissionDate(OffsetDateTime.parse("2025-01-01T00:00:00Z"));

        PhotoResponse p2 = new PhotoResponse();
        p2.setPhotoId(11L);
        p2.setTitle("t2");
        p2.setUsername("user2");
        p2.setPhotoUrl("url2");
        p2.setTotalVotes(7);
        p2.setSubmissionDate(OffsetDateTime.parse("2025-01-01T00:00:00Z"));

        when(photoMapper.findAllPhotosByContest(1L)).thenReturn(List.of(p1, p2));

        List<PhotoResponse> results = photoDisplayService.getPhotosByContest(1L);

        assertThat(results).hasSize(2);

        assertThat(results.get(0).getPhotoId()).isEqualTo(10L);
        assertThat(results.get(0).getUsername()).isEqualTo("user1");
        assertThat(results.get(0).getPhotoUrl()).isEqualTo("url1");
        assertThat(results.get(0).getTotalVotes()).isEqualTo(5);

        verify(contestMapper, times(1)).findById(1L);
        verify(photoMapper, times(1)).findAllPhotosByContest(1L);
    }
}