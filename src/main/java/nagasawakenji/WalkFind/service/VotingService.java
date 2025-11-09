package nagasawakenji.WalkFind.service;

import nagasawakenji.WalkFind.domain.dto.VoteRequest;
import nagasawakenji.WalkFind.domain.dto.VoteResult;
import nagasawakenji.WalkFind.domain.model.Contest;
import nagasawakenji.WalkFind.domain.statusenum.ContestStatus;
import nagasawakenji.WalkFind.domain.model.UserPhoto;
import nagasawakenji.WalkFind.domain.model.Vote;
import nagasawakenji.WalkFind.domain.statusenum.VoteStatus;
import nagasawakenji.WalkFind.exception.DatabaseOperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.WalkFind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.WalkFind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.WalkFind.infra.mybatis.mapper.VoteMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class VotingService {

    private final VoteMapper voteMapper;
    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper;

    /**
     * 投票のビジネスロジックを実行する。
     * @param request 投票リクエスト
     * @param userId  投票を行うユーザーID
     * @return 投票結果DTO
     */
    @Transactional
    public VoteResult submitVote(VoteRequest request, String userId) {
        Long photoId = request.getPhotoId();

        try {
            // 投稿の存在チェックとコンテストIDの取得
            UserPhoto photo = photoMapper.findPhotoDetail(photoId)
                    .orElse(null);

            if (photo == null) {
                return buildResult(photoId, VoteStatus.PHOTO_NOT_FOUND, "投票対象の投稿が見つかりません。");
            }

            // 投票期間チェック
            Contest contest = contestMapper.findContestStatus(photo.getContestId())
                    .orElse(null);

            if (contest == null || contest.getStatus() != ContestStatus.IN_PROGRESS) {
                return buildResult(photoId, VoteStatus.VOTING_CLOSED, "投票はコンテスト開催期間中のみ可能です。");
            }

            // 重複投票チェック (1投稿につき1ユーザー1回のみ)
            if (voteMapper.findByPhotoAndUser(photoId, userId).isPresent()) {
                return buildResult(photoId, VoteStatus.ALREADY_VOTED, "既にこの投稿に投票済みです。");
            }

            // 投票データの記録 (votesテーブル)
            Vote newVote = new Vote();
            newVote.setPhotoId(photoId);
            newVote.setUserId(userId);
            int voteInsertCount = voteMapper.insert(newVote);

            // 写真の投票数をインクリメント (user_photosテーブル)
            int photoUpdateCount = photoMapper.incrementTotalVotes(photoId);

            if (voteInsertCount == 1 && photoUpdateCount == 1) {
                log.info("Vote successful for photo {}. User {}", photoId, userId);
                return buildResult(photoId, VoteStatus.SUCCESS, "投票が完了しました。");
            } else {
                // データベース操作に不整合が発生した場合
                log.error("Inconsistent DB update during voting. Vote: {}, Photo: {}", voteInsertCount, photoUpdateCount);
                throw new DatabaseOperationException("投票処理中にデータベース更新の不整合が発生しました。");
            }

        } catch (DatabaseOperationException e) {
            // 自らスローした例外を再スローしてロールバックさせる
            throw e;
        } catch (Exception e) {
            // その他の予期せぬエラー（DB接続切れなど）
            log.error("Unexpected error during vote submission.", e);
            throw new RuntimeException("投票処理中に予期せぬサーバーエラーが発生しました。", e);
        }
    }

    // 結果DTOを構築するヘルパーメソッド
    private VoteResult buildResult(Long photoId, VoteStatus status, String message) {
        return VoteResult.builder()
                .photoId(photoId)
                .status(status)
                .message(message)
                .build();
    }
}