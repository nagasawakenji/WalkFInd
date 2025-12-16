package nagasawakenji.walkfind.controller;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.MyUpcomingContestsPageResponse;
import nagasawakenji.walkfind.service.AuthService;
import nagasawakenji.walkfind.service.MyUpcomingContestsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contests")
@RequiredArgsConstructor
public class MyUpcomingContestsController {

    private final AuthService authService;
    private final MyUpcomingContestsService myUpcomingContestsService;

    @GetMapping("/mine/upcoming")
    public MyUpcomingContestsPageResponse getMyUpcoming(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        String userId = authService.getAuthenticatedUserId();
        return myUpcomingContestsService.getMyUpcomingContests(userId, page, size);
    }
}