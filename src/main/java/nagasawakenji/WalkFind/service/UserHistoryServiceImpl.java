package nagasawakenji.walkfind.service;

import nagasawakenji.walkfind.domain.dto.ContestResultDto;
import nagasawakenji.walkfind.domain.dto.PhotoDto;
import nagasawakenji.walkfind.domain.dto.UserPublicProfileResponse;
import nagasawakenji.walkfind.domain.dto.UserHistoryResponse;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.model.UserProfile;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;         // ⭐ UserMapperをインポート
import nagasawakenji.walkfind.infra.mybatis.mapper.UserProfileMapper; // ⭐ UserProfileMapperをインポート
import nagasawakenji.walkfind.infra.mybatis.mapper.UserHistoryMapper; // ⭐ UserHistoryMapperをインポート
import nagasawakenji.walkfind.exception.UserStatusException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // 読み取りトランザクションを使用

import java.util.List;

/**
 * UserHistoryServiceの実装クラス。
 * ユーザーの公開情報に関する複雑な集計ロジックを担います。
 * (注: モックデータ生成を廃止し、DBアクセスに置き換えます)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserHistoryServiceImpl implements UserHistoryService {

    // ⭐ 必要なMapperを注入
    private final UserMapper userMapper;
    private final UserProfileMapper userProfileMapper;
    private final UserHistoryMapper userHistoryMapper;

    private static final int RECENT_POSTS_LIMIT = 10;

    /**
     * 特定ユーザーの公開プロフィール情報（サマリー統計を含む）を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー公開プロフィールDTO
     */
    @Override
    @Transactional(readOnly = true)
    public UserPublicProfileResponse getPublicProfileSummary(String userId) {
        log.info("Fetching public profile summary for userId: {}", userId);

        // ユーザー基本情報 (usersテーブル) を取得し、存在チェックを行う
        User user = userMapper.findById(userId)
                .orElseThrow(() -> new UserStatusException("指定されたユーザーは存在しません。", "NOT_FOUND"));

        // 公開プロフィール情報と統計情報
        UserProfile profile = userProfileMapper.findByUserId(userId)
                .orElseThrow(() -> {
                    // 通常、UserService.syncUserで作成済み
                    log.error("UserProfile record is missing for user: {}", userId);
                    return new UserStatusException("プロフィール情報が不完全です。", "INCOMPLETE_PROFILE");
                });

        // DTOを構築（
        return UserPublicProfileResponse.builder()
                .userId(user.getUserId())
                .nickname(user.getUserName())
                .profileImageUrl(profile.getProfileImageUrl())
                .bio(profile.getBio())
                .totalPosts(profile.getTotalPosts())
                .totalContestsEntered(profile.getTotalContestsEntered())
                .bestRank(profile.getBestRank())
                .build();
    }

    /**
     * 特定ユーザーのコンテスト成績詳細と最近の公開投稿履歴を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー活動履歴DTO
     */
    @Override
    @Transactional(readOnly = true)
    public UserHistoryResponse getUserActivityHistory(String userId) {
        log.info("Fetching activity history for userId: {}", userId);

        // ユーザーの存在チェック (UserHistoryMapperが実行される前にユーザーの存在を保証)
        userMapper.findById(userId)
                .orElseThrow(() -> new UserStatusException("指定されたユーザーは存在しません。", "NOT_FOUND"));

        // 1. コンテスト成績リストの取得 (UserHistoryMapperを使用)
        List<ContestResultDto> contestResults = userHistoryMapper.getUserContestResults(userId);

        // 2. 最近の公開投稿写真リストの取得 (UserHistoryMapperを使用)
        List<PhotoDto> recentPublicPosts = userHistoryMapper.getUserRecentPosts(userId, RECENT_POSTS_LIMIT);

        return UserHistoryResponse.builder()
                .contestResults(contestResults)
                .recentPublicPosts(recentPublicPosts)
                .build();
    }
}