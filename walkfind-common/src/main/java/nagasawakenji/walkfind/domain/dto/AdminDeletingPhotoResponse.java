package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Data;
import nagasawakenji.walkfind.domain.statusenum.AdminDeletePhotoStatus;

@Data
@Builder
public class AdminDeletingPhotoResponse {
    private Long contestId;
    private Long photoId;
    private AdminDeletePhotoStatus status;
    private String message;
}