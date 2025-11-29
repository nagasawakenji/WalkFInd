package nagasawakenji.walkfind.controller.debug;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestStatusUpdateResult;
import nagasawakenji.walkfind.service.ContestStatusBatchService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * ローカル専用：コンテストステータス更新デバッグ用コントローラー
 */
@RestController
@RequestMapping("/_debug/contest-status")
@RequiredArgsConstructor
@Slf4j
@Profile("local")
public class ContestStatusDebugController {

    private final ContestStatusBatchService contestStatusBatchService;

    /**
     * POST /_debug/contest-status/update
     * コンテストのステータスを一括更新（ローカル検証用）
     */
    @PostMapping("/update")
    public ResponseEntity<ContestStatusUpdateResult> updateAllContestStatuses() {

        log.info("[DEBUG] Contest status batch update triggered.");

        ContestStatusUpdateResult result = contestStatusBatchService.updateAllStatuses();

        return ResponseEntity.ok(result);
    }
}