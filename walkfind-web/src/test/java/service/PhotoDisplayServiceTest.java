package service;

import nagasawakenji.walkfind.domain.dto.PhotoListResponse;
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
import java.net.URL;

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
                photoDisplayService.getPhotosByContest(100L, 0, 20)
        )
                .isInstanceOf(ContestNotFoundException.class)
                .hasMessageContaining("not found");

        verify(contestMapper, times(1)).findById(100L);
        verify(photoMapper, never())
                .findAllPhotosByContest(anyLong(), anyInt(), anyInt(), anyInt());
        verify(photoMapper, never()).countTotalPhotos(anyLong());
    }

    // -----------------------------------------
    // 2. Contest が存在し、写真を返す正常系
    // -----------------------------------------
    @Test
    @DisplayName("getPhotosByContest: Contest が存在 → Page + Size に応じた PhotoListResponse を返す")
    void testGetPhotosSuccess() {

        // given
        when(contestMapper.findById(1L)).thenReturn(Optional.of(new Contest()));

        int page = 0;
        int size = 20;
        int offset = page * size;

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

        when(photoMapper.findAllPhotosByContest(1L, page, size, offset))
                .thenReturn(List.of(p1, p2));

        when(photoMapper.countTotalPhotos(1L)).thenReturn(2L);

        // when
        PhotoListResponse response =
                photoDisplayService.getPhotosByContest(1L, page, size);

        // then
        assertThat(response.getPhotoResponses()).hasSize(2);
        assertThat(response.getTotalCount()).isEqualTo(2);

        PhotoResponse result1 = response.getPhotoResponses().get(0);
        assertThat(result1.getPhotoId()).isEqualTo(10L);
        assertThat(result1.getUsername()).isEqualTo("user1");
        assertThat(result1.getPhotoUrl()).isEqualTo("url1");
        assertThat(result1.getTotalVotes()).isEqualTo(5);

        verify(contestMapper, times(1)).findById(1L);
        verify(photoMapper, times(1))
                .findAllPhotosByContest(1L, page, size, offset);
        verify(photoMapper, times(1)).countTotalPhotos(1L);
    }
}