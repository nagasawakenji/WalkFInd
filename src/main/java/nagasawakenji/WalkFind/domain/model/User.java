package nagasawakenji.WalkFind.domain.model;

import lombok.Data;
import nagasawakenji.WalkFind.domain.statusenum.UserRole;

import java.time.OffsetDateTime;

@Data
public class User {
    private String userId; // 投稿ユーザーID
    private String userName;
    private String email;
    private UserRole role;
    private boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
