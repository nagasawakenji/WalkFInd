package nagasawakenji.walkfind.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor          // Jackson が使う引数なしコンストラクタ
@AllArgsConstructor         // テストなどで new UpdatingContestRequest(...) したい時用
public class UpdatingContestRequest {
    private String name;
    private String theme;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
}