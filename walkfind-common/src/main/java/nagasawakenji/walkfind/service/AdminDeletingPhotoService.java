package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.AdminDeletingPhotoResponse;
import nagasawakenji.walkfind.domain.model.User;
import nagasawakenji.walkfind.domain.model.UserPhoto;
import nagasawakenji.walkfind.domain.statusenum.AdminDeletePhotoStatus;
import nagasawakenji.walkfind.domain.statusenum.UserRole;
import nagasawakenji.walkfind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.UserMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminDeletingPhotoService {

    private final PhotoMapper photoMapper;
    private final UserMapper userMapper;

    @Transactional
    public AdminDeletingPhotoResponse deletePhoto(Long contestId, Long photoId, String requesterUserId) {
        // admin only
        User requester = userMapper.findById(requesterUserId)
                .orElseThrow(() -> new AccessDeniedException("admin only"));
        if (requester.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("admin only");
        }

        Optional<UserPhoto> photoOpt = photoMapper.findByIdAndContestId(contestId, photoId);
        if (photoOpt.isEmpty()) {
            return AdminDeletingPhotoResponse.builder()
                    .contestId(contestId)
                    .photoId(photoId)
                    .status(AdminDeletePhotoStatus.NOT_FOUND)
                    .message("写真が存在しません")
                    .build();
        }

        UserPhoto photo = photoOpt.get();
        if (photo.getRemovedAt() != null) {
            return AdminDeletingPhotoResponse.builder()
                    .contestId(contestId)
                    .photoId(photoId)
                    .status(AdminDeletePhotoStatus.ALREADY_REMOVED)
                    .message("すでに削除済みです")
                    .build();
        }

        int updated = photoMapper.logicalDeleteByIdForAdmin(contestId, photoId, requesterUserId);
        if (updated == 0) {
            // removed_at が同時に付いた等の競合を安全側に倒す
            return AdminDeletingPhotoResponse.builder()
                    .contestId(contestId)
                    .photoId(photoId)
                    .status(AdminDeletePhotoStatus.ALREADY_REMOVED)
                    .message("すでに削除済みです")
                    .build();
        }

        return AdminDeletingPhotoResponse.builder()
                .contestId(contestId)
                .photoId(photoId)
                .status(AdminDeletePhotoStatus.SUCCESS)
                .message("写真を削除（論理削除）しました")
                .build();
    }
}