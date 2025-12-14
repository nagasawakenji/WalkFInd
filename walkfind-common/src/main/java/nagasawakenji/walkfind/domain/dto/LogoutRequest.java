package nagasawakenji.walkfind.domain.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class LogoutRequest {
    /**
     * 例: 全端末ログアウトしたい等が将来必要なら使える
     * 今は未使用でもOK（nullでもOK）
     */
    Boolean logoutFromAllDevices;
}
