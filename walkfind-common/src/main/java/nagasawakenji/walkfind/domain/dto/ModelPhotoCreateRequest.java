package nagasawakenji.walkfind.domain.dto;

import lombok.Value;

@Value
public class ModelPhotoCreateRequest {
    String photoUrl;
    String title;
    String description;
}