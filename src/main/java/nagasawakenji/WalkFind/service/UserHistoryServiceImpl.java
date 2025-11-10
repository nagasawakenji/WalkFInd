package nagasawakenji.WalkFind.service;

import nagasawakenji.WalkFind.domain.dto.ContestResultDto;
import nagasawakenji.WalkFind.domain.dto.PhotoDto;
import nagasawakenji.WalkFind.domain.dto.UserPublicProfileResponse;
import nagasawakenji.WalkFind.domain.dto.UserHistoryResponse;
import nagasawakenji.WalkFind.exception.UserStatusException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * UserHistoryServiceの実装クラス。
 * ユーザーの公開情報に関する複雑な集計ロジックを担います。
 * (注: Repositoryの代わりにモックデータを使用しています)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserHistoryServiceImpl implements UserHistoryService {

    // 実際は UserRepository, PhotoRepository, ContestResultRepository などを注入します
    // private final UserRepository userRepository;
    // private final PhotoRepository photoRepository;
    // private final ContestResultRepository contestResultRepository;

    private static final int RECENT_POSTS_LIMIT = 10;

    /**
     * 特定ユーザーの公開プロフィール情報（サマリー統計を含む）を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー公開プロフィールDTO
     */
    @Override
    public UserPublicProfileResponse getPublicProfileSummary(String userId) {
        log.info("Fetching public profile summary for userId: {}", userId);

        // 1. ユーザー基本情報を取得 (存在チェックを兼ねる)
        // 実際: userRepository.findById(userId).orElseThrow(() -> new UserStatusException("ユーザーが見つかりません", "NOT_FOUND"));
        if ("nonexistent".equals(userId)) {
            throw new UserStatusException("指定されたユーザーは存在しません。", "NOT_FOUND");
        }

        // 2. 統計情報を集計し、DTOを構築
        // --- モックデータ生成 ---
        int totalPosts = userId.hashCode() % 50 + 10;
        int totalContests = userId.hashCode() % 10 + 1;
        int bestRank = userId.hashCode() % 3 + 1;
        // ------------------------

        return UserPublicProfileResponse.builder()
                .userId(userId)
                .nickname("Walker_" + userId.substring(0, 4))
                .profileImageUrl("https://placehold.co/100x100/32CD32/white?text=" + userId.substring(0, 1))
                .bio("歩いて見つけた美しい風景を共有します。")
                .totalPosts(totalPosts)
                .totalContestsEntered(totalContests)
                .bestRank(bestRank)
                .build();
    }

    /**
     * 特定ユーザーのコンテスト成績詳細と最近の公開投稿履歴を取得します。
     * @param userId 対象ユーザーID
     * @return ユーザー活動履歴DTO
     */
    @Override
    public UserHistoryResponse getUserActivityHistory(String userId) {
        log.info("Fetching activity history for userId: {}", userId);

        // 1. コンテスト成績リストの取得
        List<ContestResultDto> contestResults = generateMockContestResults(userId);

        // 2. 最近の公開投稿写真リストの取得
        List<PhotoDto> recentPublicPosts = generateMockRecentPosts(userId, RECENT_POSTS_LIMIT);

        return UserHistoryResponse.builder()
                .contestResults(contestResults)
                .recentPublicPosts(recentPublicPosts)
                .build();
    }

    // --- モックデータ生成ヘルパーメソッド ---

    private List<ContestResultDto> generateMockContestResults(String userId) {
        return List.of(
                ContestResultDto.builder()
                        .contestId("C002")
                        .contestName("夏の夕焼けコンテスト")
                        .heldDate(LocalDateTime.now().minusMonths(1))
                        .rank(1)
                        .totalParticipants(85)
                        .photoId("P105").build(),
                ContestResultDto.builder()
                        .contestId("C001")
                        .contestName("春の桜コンテスト")
                        .heldDate(LocalDateTime.now().minusMonths(3))
                        .rank(2)
                        .totalParticipants(150)
                        .photoId("P101").build()
        );
    }

    private List<PhotoDto> generateMockRecentPosts(String userId, int limit) {
        return List.of(
                PhotoDto.builder()
                        .photoId("P203")
                        .photoUrl("https://placehold.co/300x200/4682B4/white?text=Recent_3")
                        .description("公園の噴水")
                        .postDate(LocalDateTime.now().minusDays(1))
                        .likesCount(45)
                        .isPrivate(false).build(),
                PhotoDto.builder()
                        .photoId("P202")
                        .photoUrl("https://placehold.co/300x200/F08080/white?text=Recent_2")
                        .description("猫がいる路地")
                        .postDate(LocalDateTime.now().minusDays(3))
                        .likesCount(60)
                        .isPrivate(false).build(),
                PhotoDto.builder()
                        .photoId("P201")
                        .photoUrl("https://placehold.co/300x200/90EE90/black?text=Recent_1")
                        .description("朝焼けの山頂")
                        .postDate(LocalDateTime.now().minusDays(5))
                        .likesCount(88)
                        .isPrivate(false).build()
        );
    }
}