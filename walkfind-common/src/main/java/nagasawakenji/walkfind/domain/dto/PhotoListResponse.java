package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PhotoListResponse {

    List<PhotoResponse> photoResponses;
    long totalCount;

}
