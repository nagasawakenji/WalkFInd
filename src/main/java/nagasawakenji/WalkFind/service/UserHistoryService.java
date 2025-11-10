package nagasawakenji.WalkFind.service;

import nagasawakenji.WalkFind.domain.dto.UserPublicProfileResponse;
import nagasawakenji.WalkFind.domain.dto.UserHistoryResponse;

/**
 * 他ユーザー向けの公開プロフィール情報および活動履歴の集計・取得を行うサービスインターフェース。
 */
public interface UserHistoryService {

    /**
     * 特定ユーザーの公開プロフィール情報（サマリー統計を含む）を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー公開プロフィールDTO
     * @throws nagasawakenji.WalkFind.exception.UserStatusException ユーザーが見つからない場合
     */
    UserPublicProfileResponse getPublicProfileSummary(String userId);

    /**
     * 特定ユーザーのコンテスト成績詳細と最近の公開投稿履歴を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー活動履歴DTO
     */
    UserHistoryResponse getUserActivityHistory(String userId);
}