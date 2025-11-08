package nagasawakenji.WalkFind.domain.model;

import lombok.Data;

@Data
public class ContestResult {
    private Long id;
    private Long contestId;
    private Long photoId;
    private Integer finalRank;
    private Integer finalScore; // 確定投票数または最終点数
    private Boolean isWinner;
    private OffsetDateTime calculatedAt;
}
