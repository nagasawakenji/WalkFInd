package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ModelPhotoCreateRequest;
import nagasawakenji.walkfind.domain.dto.ModelPhotoCreateResponse;
import nagasawakenji.walkfind.domain.dto.ModelPhotoDeleteResponse;
import nagasawakenji.walkfind.domain.dto.ModelPhotoResponse;
import nagasawakenji.walkfind.domain.statusenum.ModelPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.service.ContestModelPhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class ContestModelPhotoController {

    private final ContestModelPhotoService modelPhotoService;

    /**
     * 管理者: モデル写真の追加
     */
    @PreAuthorize("hasRole('admin')")
    @PostMapping("/contests/{contestId}/model-photos")
    public ResponseEntity<ModelPhotoCreateResponse> addModelPhoto(
            @PathVariable Long contestId,
            @RequestBody ModelPhotoCreateRequest request
    ) {
        ModelPhotoCreateResponse response = modelPhotoService.addModelPhoto(contestId, request);

        if (response.getStatus() == ModelPhotoStatus.SUCCESS) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 一般ユーザー: モデル写真一覧を取得 (DTO)
     */
    @GetMapping("/contests/{contestId}/model-photos")
    public ResponseEntity<List<ModelPhotoResponse>> getModelPhotos(
            @PathVariable Long contestId
    ) {
        return ResponseEntity.ok(modelPhotoService.getModelPhotos(contestId));
    }

    /**
     * 管理者: モデル写真の削除
     */
    @PreAuthorize("hasRole('admin')")
    @DeleteMapping("/model-photos/{id}")
    public ResponseEntity<ModelPhotoDeleteResponse> deleteModelPhoto(@PathVariable Long id) {

        ModelPhotoDeleteResponse response = modelPhotoService.deleteModelPhoto(id);

        if (response.getStatus() == ModelPhotoStatus.SUCCESS) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * 共通エラーハンドリング
     */
    @ExceptionHandler({RuntimeException.class, DatabaseOperationException.class})
    public ResponseEntity<Object> handleErrors(Exception ex) {
        log.error("Internal Error in ContestModelPhotoController", ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("サーバで予期しないエラーが発生しました。");
    }
}