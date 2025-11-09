package nagasawakenji.WalkFind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.WalkFind.domain.statusenum.ContestStatus;
import java.time.OffsetDateTime;

/**
 * 特定のコンテスト詳細表示用のDTO。
 */
@Value
@Builder
public class ContestDetailResponse {
    private final Long contestId;
    private final String name;
    private final String theme;
    private final ContestStatus status;
    private final OffsetDateTime startDate;
    private final OffsetDateTime endDate;

    // ユーザーの投稿状況など、詳細情報があればここに追加する
}