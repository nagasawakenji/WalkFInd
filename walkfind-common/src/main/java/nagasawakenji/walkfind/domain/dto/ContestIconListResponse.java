package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.model.ContestIcon;

import java.util.List;

/**
 * 特定のコンテストアイコン表示用のDTO。
 */
@Value
@Builder
public class ContestIconListResponse {

    List<ContestIconResponse> icons;
    int totalCount;
}
