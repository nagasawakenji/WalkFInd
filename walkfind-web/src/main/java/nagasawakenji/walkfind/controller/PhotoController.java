package nagasawakenji.walkfind.controller;

import nagasawakenji.walkfind.domain.dto.SubmitPhotoRequest;
import nagasawakenji.walkfind.domain.dto.SubmitPhotoResult;
import nagasawakenji.walkfind.domain.statusenum.SubmitPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.PhotoSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoController {

    private final PhotoSubmissionService photoService;
    private final AuthService authService;

    /**
     * POST /api/v1/photos : 写真投稿エンドポイント
     * @param request 投稿リクエストDTO
     * @return 処理結果DTOとHTTPステータス
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubmitPhotoResult> submitPhoto(
            @Valid @RequestPart SubmitPhotoRequest request,
            @RequestPart MultipartFile file
            ) {

        // 1. 認証情報（ユーザーID）の取得 (Controllerの責務)
        // Spring SecurityのContextから取得することを想定
        String userId = authService.getAuthenticatedUserId();

        // 2. Service層の呼び出し
        SubmitPhotoResult result = photoService.submitPhoto(request, userId);

        // 3. 結果ステータスに基づいたHTTPステータスコードの返却
        return handleSubmissionResult(result);
    }

    /**
     * Service層の処理結果に基づいてResponseEntityを構築するヘルパーメソッド
     */
    private ResponseEntity<SubmitPhotoResult> handleSubmissionResult(SubmitPhotoResult result) {
        return switch (result.getStatus()) {
            case SUCCESS ->
                // 成功: HTTP 201 Created
                    new ResponseEntity<>(result, HttpStatus.CREATED);
            case BUSINESS_RULE_VIOLATION ->
                // 期間外、重複投稿など: HTTP 409 Conflict (競合) または 400 Bad Request
                    new ResponseEntity<>(result, HttpStatus.CONFLICT);
            case VALIDATION_FAILED ->
                // 入力値の形式エラーなど: HTTP 400 Bad Request (これは@Validで大部分捕捉されるが、念のため)
                    new ResponseEntity<>(result, HttpStatus.BAD_REQUEST);
            case INTERNAL_SERVER_ERROR ->
                // データベース接続失敗など: HTTP 500 Internal Server Error
                    new ResponseEntity<>(result, HttpStatus.INTERNAL_SERVER_ERROR);
            default ->
                    new ResponseEntity<>(result, HttpStatus.INTERNAL_SERVER_ERROR);
        };
    }

    /**
     * データベース例外など、Service層からスローされたRuntimeExceptionを捕捉する
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<SubmitPhotoResult> handleInternalErrors(Exception ex) {
        log.error("Unhandled Internal Error during photo submission.", ex);

        SubmitPhotoResult errorResult = SubmitPhotoResult.builder()
                .photoId(null)
                .status(SubmitPhotoStatus.INTERNAL_SERVER_ERROR)
                .message("サーバーで予期せぬエラーが発生しました。時間を置いて再度お試しください。")
                .build();

        return new ResponseEntity<>(errorResult, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}