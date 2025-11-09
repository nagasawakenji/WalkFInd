package nagasawakenji.WalkFind.controller;

import nagasawakenji.WalkFind.domain.dto.VoteRequest;
import nagasawakenji.WalkFind.domain.dto.VoteResult;
import nagasawakenji.WalkFind.domain.statusenum.VoteStatus;
import nagasawakenji.WalkFind.exception.DatabaseOperationException;
import nagasawakenji.WalkFind.service.AuthService;
import nagasawakenji.WalkFind.service.VotingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/votes")
@RequiredArgsConstructor
@Slf4j
public class VoteController {

    private final VotingService votingService;
    private final AuthService authService;

    /**
     * POST /api/v1/votes : 投票エンドポイント
     */
    @PostMapping
    public ResponseEntity<VoteResult> submitVote(@Valid @RequestBody VoteRequest request) {

        // 認証済みユーザーIDの取得
        String userId = authService.getAuthenticatedUserId();

        // Service層の呼び出し
        VoteResult result = votingService.submitVote(request, userId);

        // 結果ステータスに基づいたHTTPステータスコードの返却
        return handleVoteResult(result);
    }

    /**
     * Service層の処理結果に基づいてResponseEntityを構築するヘルパーメソッド
     */
    private ResponseEntity<VoteResult> handleVoteResult(VoteResult result) {
        return switch (result.getStatus()) {
            case SUCCESS ->
                    new ResponseEntity<>(result, HttpStatus.CREATED);
            case ALREADY_VOTED ->
                // 重複投票: HTTP 409 Conflict
                    new ResponseEntity<>(result, HttpStatus.CONFLICT);
            case VOTING_CLOSED, PHOTO_NOT_FOUND ->
                // 期間外や対象なし（クライアント側の操作ミス）: HTTP 400 Bad Request
                    new ResponseEntity<>(result, HttpStatus.BAD_REQUEST);
            case INTERNAL_SERVER_ERROR ->
                // Service層がRuntimeExceptionをスローしなかった場合のフォールバック
                    new ResponseEntity<>(result, HttpStatus.INTERNAL_SERVER_ERROR);
            default ->
                    new ResponseEntity<>(result, HttpStatus.INTERNAL_SERVER_ERROR);
        };
    }

    /**
     * データベース例外など、Service層からスローされたRuntimeExceptionを捕捉する
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<VoteResult> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during vote submission.", ex);

        VoteResult errorResult = VoteResult.builder()
                .photoId(null)
                .status(VoteStatus.INTERNAL_SERVER_ERROR)
                .message("サーバーで予期せぬエラーが発生しました。時間を置いて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}