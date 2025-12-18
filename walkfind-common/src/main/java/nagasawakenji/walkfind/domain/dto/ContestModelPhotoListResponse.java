package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;
import nagasawakenji.walkfind.domain.statusenum.ContestModelPhotoCreateStatus;

import java.util.List;

@Value
@Builder
public class ContestModelPhotoListResponse {
    ContestModelPhotoCreateStatus status;
    List<ContestModelPhotoCreateResponse> photos;
}
