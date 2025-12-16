package nagasawakenji.walkfind.controller.admin;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.AdminContestsPageResponse;
import nagasawakenji.walkfind.service.AdminContestsService;
import nagasawakenji.walkfind.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/contests")
@RequiredArgsConstructor
public class AdminContestsController {

    private final AuthService authService;
    private final AdminContestsService adminContestsService;

    @GetMapping
    public ResponseEntity<AdminContestsPageResponse> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "includeRemoved", defaultValue = "false") boolean includeRemoved,
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        String userId = authService.getAuthenticatedUserId();
        AdminContestsPageResponse res =
                adminContestsService.listContests(userId, page, size, status, includeRemoved, keyword);
        return ResponseEntity.ok(res);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Void> handleDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }
}