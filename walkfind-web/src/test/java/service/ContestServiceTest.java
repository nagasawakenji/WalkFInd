package service;

import nagasawakenji.walkfind.domain.dto.ContestDetailResponse;
import nagasawakenji.walkfind.domain.dto.ContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.exception.ContestNotFoundException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;

import nagasawakenji.walkfind.service.ContestService;
import org.junit.jupiter.api.BeforeEach;
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
class ContestServiceTest {

    @Mock
    private ContestMapper contestMapper;

    @InjectMocks
    private ContestService contestService;

    private Contest contest;

    @BeforeEach
    void setup() {
        contest = new Contest();
        contest.setId(1L);
        contest.setName("Test Contest");
        contest.setTheme("Nature");
        contest.setStatus(ContestStatus.UPCOMING);
        contest.setStartDate(OffsetDateTime.parse("2025-01-01T00:00:00Z"));
        contest.setEndDate(OffsetDateTime.parse("2025-01-10T00:00:00Z"));
    }

    // ----------------------------------------
    // getAllActiveContests()
    // ----------------------------------------
    @Test
    @DisplayName("getAllActiveContests: アクティブなコンテスト一覧を返す")
    void testGetAllActiveContests() {

        when(contestMapper.findAllActiveContests()).thenReturn(List.of(contest));

        List<ContestResponse> responses = contestService.getAllActiveContests();

        assertThat(responses).hasSize(1);

        ContestResponse res = responses.get(0);
        assertThat(res.getContestId()).isEqualTo(1L);
        assertThat(res.getName()).isEqualTo("Test Contest");
        assertThat(res.getTheme()).isEqualTo("Nature");
        assertThat(res.getStatus()).isEqualTo(ContestStatus.UPCOMING);

        verify(contestMapper, times(1)).findAllActiveContests();
    }

    // ----------------------------------------
    // getContestDetail()
    // ----------------------------------------
    @Test
    @DisplayName("getContestDetail: コンテストが存在する場合に詳細を返す")
    void testGetContestDetailSuccess() {

        when(contestMapper.findById(1L)).thenReturn(Optional.of(contest));

        ContestDetailResponse res = contestService.getContestDetail(1L);

        assertThat(res.getContestId()).isEqualTo(1L);
        assertThat(res.getName()).isEqualTo("Test Contest");
        assertThat(res.getTheme()).isEqualTo("Nature");
        assertThat(res.getStatus()).isEqualTo(ContestStatus.UPCOMING);
    }

    @Test
    @DisplayName("getContestDetail: コンテストが存在しない場合に例外を投げる")
    void testGetContestDetailNotFound() {

        when(contestMapper.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contestService.getContestDetail(999L))
                .isInstanceOf(ContestNotFoundException.class)
                .hasMessageContaining("Contest ID 999 not found.");

        verify(contestMapper, times(1)).findById(999L);
    }
}