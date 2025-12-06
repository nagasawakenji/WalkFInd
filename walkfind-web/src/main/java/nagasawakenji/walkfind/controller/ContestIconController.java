package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestIconListResponse;
import nagasawakenji.walkfind.domain.dto.ContestIconResponse;
import nagasawakenji.walkfind.service.LocalContestIconService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/contest-icons")
@RequiredArgsConstructor
@Slf4j
public class ContestIconController {

    private final LocalContestIconService localContestIconService;

    /**
     * 複数コンテストのアイコンをまとめて取得
     * GET /api/v1/contest-icons?ids=1,2,3
     */
    @GetMapping
    public ContestIconListResponse getIcons(@RequestParam("ids") String ids) {
        List<Long> contestIds = Arrays.stream(ids.split(","))
                .map(Long::parseLong)
                .collect(Collectors.toList());

        return localContestIconService.getIconUrl(contestIds);
    }

    /**
     * アイコンの新規登録・更新
     * POST /api/v1/contest-icons/{contestId}
     * multipart/form-data で file を受け取る
     */
    @PostMapping("/{contestId}")
    public ContestIconResponse uploadOrUpdate(
            @PathVariable("contestId") Long contestId,
            @RequestParam("file") MultipartFile file
    ) {
        log.info("Uploading icon for contestId={}", contestId);
        return localContestIconService.uploadAndSaveIcon(contestId, file);
    }

    /**
     * アイコン削除
     * DELETE /api/v1/contest-icons/{contestId}
     */
    @DeleteMapping("/{contestId}")
    public ContestIconResponse delete(@PathVariable("contestId") Long contestId) {
        log.info("Deleting icon for contestId={}", contestId);
        return localContestIconService.deleteIcon(contestId);
    }
}