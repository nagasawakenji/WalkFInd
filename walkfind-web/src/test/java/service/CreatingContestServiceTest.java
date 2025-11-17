package service;

import nagasawakenji.walkfind.domain.dto.CreatingContestResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.statusenum.ContestStatus;
import nagasawakenji.walkfind.domain.statusenum.CreationContestStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;

import nagasawakenji.walkfind.service.CreatingContestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreatingContestServiceTest {

    @Mock
    private ContestMapper contestMapper;

    @InjectMocks
    private CreatingContestService creatingContestService;

    private OffsetDateTime now;
    private OffsetDateTime futureStart;
    private OffsetDateTime futureEnd;

    @BeforeEach
    void setup() {
        now = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        futureStart = now.plusDays(1);
        futureEnd = now.plusDays(2);
    }

    // -------------------------------------
    // 1. 名前重複
    // -------------------------------------
    @Test
    @DisplayName("createContest: 名前重複 → NAME_DUPLICATED を返す")
    void testNameDuplicated() {
        when(contestMapper.isExistContestByName("AAA")).thenReturn(true);

        CreatingContestResponse res = creatingContestService.createContest(
                "AAA", "theme", futureStart, futureEnd
        );

        assertThat(res.getStatus()).isEqualTo(CreationContestStatus.NAME_DUPLICATED);
        assertThat(res.getMessage()).contains("重複");
    }

    // -------------------------------------
    // 2. 開始日が過去
    // -------------------------------------
    @Test
    @DisplayName("createContest: 開始日が現在より前 → INVALID_DATE")
    void testInvalidStartDate() {

        OffsetDateTime past = now.minusDays(1);

        when(contestMapper.isExistContestByName("AAA")).thenReturn(false);

        CreatingContestResponse res = creatingContestService.createContest(
                "AAA", "theme", past, futureEnd
        );

        assertThat(res.getStatus()).isEqualTo(CreationContestStatus.INVALID_DATE);
        assertThat(res.getMessage()).contains("開始日");
    }

    // -------------------------------------
    // 3. 終了日が開始日より前 or 同じ
    // -------------------------------------
    @Test
    @DisplayName("createContest: 終了日が開始日より後でない → INVALID_DATE")
    void testInvalidEndDate() {

        when(contestMapper.isExistContestByName("AAA")).thenReturn(false);

        CreatingContestResponse res = creatingContestService.createContest(
                "AAA", "theme", futureStart, futureStart // 同じ
        );

        assertThat(res.getStatus()).isEqualTo(CreationContestStatus.INVALID_DATE);
        assertThat(res.getMessage()).contains("終了日");
    }

    // -------------------------------------
    // 4. 正常系
    // -------------------------------------
    @Test
    @DisplayName("createContest: 正常作成 → SUCCESS を返す")
    void testCreateContestSuccess() {

        when(contestMapper.isExistContestByName("AAA")).thenReturn(false);
        when(contestMapper.insert(any())).thenAnswer(invocation -> {
            Contest c = invocation.getArgument(0);
            c.setId(10L);
            return 1;
        });

        CreatingContestResponse res = creatingContestService.createContest(
                "AAA", "theme", futureStart, futureEnd
        );

        assertThat(res.getStatus()).isEqualTo(CreationContestStatus.SUCCESS);
        assertThat(res.getContestId()).isEqualTo(10L);
        assertThat(res.getName()).isEqualTo("AAA");
    }

    // -------------------------------------
    // 5. insert が 0 行 → DatabaseOperationException
    // -------------------------------------
    @Test
    @DisplayName("createContest: insert が 0 → DatabaseOperationException を throw")
    void testInsertZeroRows() {

        when(contestMapper.isExistContestByName("AAA")).thenReturn(false);
        when(contestMapper.insert(any())).thenReturn(0);

        assertThatThrownBy(() ->
                creatingContestService.createContest("AAA", "theme", futureStart, futureEnd)
        )
                .isInstanceOf(DatabaseOperationException.class)
                .hasMessageContaining("保存に失敗");
    }

    // -------------------------------------
    // 6. 予期せぬ例外 → RuntimeException
    // -------------------------------------
    @Test
    @DisplayName("createContest: insert 中に例外 → RuntimeException を throw")
    void testUnexpectedException() {

        when(contestMapper.isExistContestByName("AAA")).thenReturn(false);
        when(contestMapper.insert(any())).thenThrow(new RuntimeException("SQL error"));

        assertThatThrownBy(() ->
                creatingContestService.createContest("AAA", "theme", futureStart, futureEnd)
        )
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("予期せぬエラー");
    }
}