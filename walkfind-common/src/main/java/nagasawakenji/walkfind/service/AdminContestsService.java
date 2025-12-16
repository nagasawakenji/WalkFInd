package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import nagasawakenji.walkfind.domain.dto.AdminContestsPageResponse;
import nagasawakenji.walkfind.domain.dto.AdminContestResponse;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.statusenum.UserRole;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import org.springframework.stereotype.Service;

import org.springframework.security.access.AccessDeniedException;
import java.util.Optional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminContestsService {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final ContestMapper contestMapper;
    private final UserMapper userMapper;

    public AdminContestsPageResponse listContests(
            String requesterUserId,
            int page,
            int size,
            String status,
            boolean includeRemoved,
            String keyword
    ) {
        Optional<User> requiredUserOpt = userMapper.findById(requesterUserId);
        if (requiredUserOpt == null || requiredUserOpt.isEmpty()) {
            throw new AccessDeniedException("admin only");
        }

        User requiredUser = requiredUserOpt.get();
        requireAdmin(requiredUser);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);

        long offsetLong = (long) safePage * (long) safeSize;
        int offset = offsetLong > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) offsetLong;

        String kw = (keyword == null) ? null : keyword.trim();
        if (kw != null && kw.isBlank()) kw = null;

        List<AdminContestResponse> contests =
                contestMapper.findAdminContests(safeSize, offset, status, includeRemoved, kw);

        long totalCount =
                contestMapper.countAdminContests(status, includeRemoved, kw);

        return new AdminContestsPageResponse(contests, totalCount, safePage, safeSize);
    }

    private void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new AccessDeniedException("admin only");
        }
    }

    private boolean isAdmin(User user) {
        return user != null && user.getRole() == UserRole.ADMIN;
    }
}