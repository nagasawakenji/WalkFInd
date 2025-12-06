package nagasawakenji.walkfind.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestIconListResponse;
import nagasawakenji.walkfind.domain.dto.ContestIconRequest;
import nagasawakenji.walkfind.domain.dto.ContestIconResponse;
import nagasawakenji.walkfind.service.ContestIconService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/contest-icons")
@RequiredArgsConstructor
@Slf4j
public class ContestIconController {

    private final ContestIconService s3ContestIconService;

    /**
     * 複数コンテストのアイコンをまとめて取得
     * GET /api/v1/contest-icons?ids=1,2,3
     * DBに保存されたキーから署名付きダウンロードURLを生成して返します。
     */
    @GetMapping
    public ContestIconListResponse getIcons(@RequestParam("ids") String ids) {
        List<Long> contestIds = Arrays.stream(ids.split(","))
                .map(Long::parseLong)
                .collect(Collectors.toList());

        return s3ContestIconService.getIconUrl(contestIds);
    }


    /**
     * 【Step 2】アイコン登録完了（S3アップロード後のDB更新）
     * POST /api/v1/contest-icons/{contestId}
     * クライアントがS3へのアップロードに成功した後、S3のキーを送信してDBを更新します。
     */
    @PostMapping("/{contestId}")
    public ContestIconResponse registerIcon(
            @PathVariable("contestId") Long contestId,
            @RequestBody ContestIconRequest request
    ) {
        log.info("Registering uploaded icon for contestId={}, key={}", contestId, request.getKey());
        return s3ContestIconService.registerUploadedIcon(contestId, request.getKey());
    }

    /**
     * アイコン削除
     * DELETE /api/v1/contest-icons/{contestId}
     */
    @DeleteMapping("/{contestId}")
    public ContestIconResponse delete(@PathVariable("contestId") Long contestId) {
        log.info("Deleting icon for contestId={}", contestId);
        return s3ContestIconService.deleteIcon(contestId);
    }


}