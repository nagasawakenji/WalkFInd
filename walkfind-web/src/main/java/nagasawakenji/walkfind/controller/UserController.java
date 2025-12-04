package nagasawakenji.walkfind.controller;

import nagasawakenji.walkfind.domain.dto.UserProfileResponse;
import nagasawakenji.walkfind.domain.dto.UserPublicProfileResponse;
import nagasawakenji.walkfind.domain.dto.UserHistoryResponse;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.UserService;
import nagasawakenji.walkfind.service.UserHistoryService;
import nagasawakenji.walkfind.exception.UserStatusException;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final AuthService authService;
    private final UserHistoryService userHistoryService; // ★ UserHistoryServiceを注入

    /**
     * GET /api/v1/users/me : 認証済みユーザー自身のプロフィール情報を取得する。
     * @return ユーザープロフィールDTO
     * 認証が必要
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile() {
        // 1. 認証済みユーザーIDを取得 (Spring Security Contextから)
        String userId = authService.getAuthenticatedUserId();

        // 2. Service層を呼び出し、DBから情報を取得
        UserProfileResponse profile = userService.getUserProfile(userId);

        return ResponseEntity.ok(profile);
    }

    /**
     * GET /api/v1/users/{userId} : 特定ユーザーの公開プロフィール情報（サマリー統計を含む）を取得する
     * @param userId 対象ユーザーID
     * @return ユーザー公開プロフィールDTO (UserPublicProfileResponse)
     * 認証は不要
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserPublicProfileResponse> getUserPublicProfile(@PathVariable("userId") String userId) {
        log.info("Request for public profile summary: {}", userId);
        // UserHistoryServiceを呼び出し、公開プロフィールサマリーを取得
        UserPublicProfileResponse publicProfile = userHistoryService.getPublicProfileSummary(userId);
        return ResponseEntity.ok(publicProfile);
    }

    /**
     * GET /api/v1/users/{userId}/history : 特定ユーザーのコンテスト成績や過去の投稿を取得する
     * @param userId 対象ユーザーID
     * @return ユーザー活動履歴DTO (UserHistoryResponse)
     * 認証は不要
     */
    @GetMapping("/{userId}/history")
    public ResponseEntity<UserHistoryResponse> getUserActivityHistory(@PathVariable("userId") String userId) {
        log.info("Request for user activity history: {}", userId);
        // UserHistoryServiceを呼び出し、活動履歴詳細を取得
        UserHistoryResponse history = userHistoryService.getUserActivityHistory(userId);
        return ResponseEntity.ok(history);
    }

    // --- 例外ハンドリング ---

    /**
     * ユーザーの状態に関する例外（未登録、アカウント停止など）を捕捉する。
     * ユーザー未登録（NOT_FOUND）の場合は 404、アカウント停止（SUSPENDED）の場合は 403 Forbiddenを返す。
     */
    @ExceptionHandler(UserStatusException.class)
    public ResponseEntity<String> handleUserStatusException(UserStatusException ex) {
        log.warn("User status error: Code={}, Message={}", ex.getErrorCode(), ex.getMessage());

        if ("NOT_FOUND".equals(ex.getErrorCode())) {
            // ユーザーIDが見つからない場合
            return new ResponseEntity<>(ex.getMessage(), HttpStatus.NOT_FOUND); // 404
        }
        if ("SUSPENDED".equals(ex.getErrorCode())) {
            // アカウントが停止されている場合
            return new ResponseEntity<>(ex.getMessage(), HttpStatus.FORBIDDEN); // 403
        }

        return new ResponseEntity<>(ex.getMessage(), HttpStatus.BAD_REQUEST); // 400
    }

    /**
     * データベース例外など、予期せぬ内部エラーを捕捉する（グローバルハンドラーがない場合）。
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<String> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error in UserController.", ex);
        return new ResponseEntity<>("Internal Server Error occurred.", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}