package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoCreateRequest;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoCreateResponse;
import nagasawakenji.walkfind.domain.dto.ContestModelPhotoListResponse;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestModelPhoto;
import nagasawakenji.walkfind.domain.statusenum.ContestModelPhotoCreateStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestModelPhotoService {

    private final ContestMapper contestMapper;
    private final ContestModelPhotoMapper contestModelPhotoMapper;
    private final S3DeleteService s3DeleteService;

    /**
     * POST /api/v1/contests/{contestId}/modelPhoto
     * - DB登録に失敗したら補償としてS3削除（ベストエフォート）
     * - S3削除失敗は握りつぶし、DBロールバックを優先
     */
    @Transactional
    public ContestModelPhotoListResponse create(Long contestId, String requesterUserId, ContestModelPhotoCreateRequest req) {
        // 形式的なバリデーションは Controller の @Valid を前提にしつつ、防御的にチェック
        if (req == null || isBlank(req.getKey()) || isBlank(req.getTitle())) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.INVALID_REQUEST)
                    .photos(List.of())
                    .build();
        }

        Contest contest = contestMapper.findById(contestId)
                .orElse(null);
        if (contest == null) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.CONTEST_NOT_FOUND)
                    .photos(List.of())
                    .build();
        }

        String ownerUserId = contest.getCreatedByUserId();
        if (ownerUserId == null || !ownerUserId.equals(requesterUserId)) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.FORBIDDEN)
                    .photos(List.of())
                    .build();
        }

        try {
            ContestModelPhoto photo = new ContestModelPhoto();
            photo.setContestId(contestId);
            photo.setPhotoUrl(req.getKey()); // DBのphoto_urlに「S3 key」を保存
            photo.setTitle(req.getTitle());
            photo.setDescription(req.getDescription());

            contestModelPhotoMapper.insert(photo); // useGeneratedKeys=true を前提
            ContestModelPhoto created = contestModelPhotoMapper.findById(photo.getId());

            ContestModelPhotoCreateResponse body = ContestModelPhotoCreateResponse.builder()
                    .id(created.getId())
                    .contestId(created.getContestId())
                    .key(created.getPhotoUrl())
                    .title(created.getTitle())
                    .description(created.getDescription())
                    .createdAt(created.getCreatedAt())
                    .build();

            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.SUCCESS)
                    .photos(List.of(body))
                    .build();

        } catch (Exception e) {
            // ★補償: DB登録に失敗したので、ベストエフォートでS3を消す
            bestEffortDeleteS3(req.getKey());

            // ★ロールバック優先: S3削除エラーは握りつぶして、例外を投げてTxを落とす
            throw new DatabaseOperationException("Failed to create contest model photo. contestId=" + contestId, e);
        }
    }

    @Transactional(readOnly = true)
    public ContestModelPhotoListResponse list(Long contestId) {
        List<ContestModelPhoto> photos = contestModelPhotoMapper.findByContestId(contestId);

        var res = photos.stream().map(p ->
                ContestModelPhotoCreateResponse.builder()
                        .id(p.getId())
                        .contestId(p.getContestId())
                        .key(p.getPhotoUrl())
                        .title(p.getTitle())
                        .description(p.getDescription())
                        .createdAt(p.getCreatedAt())
                        .build()
        ).toList();

        return ContestModelPhotoListResponse.builder()
                .status(ContestModelPhotoCreateStatus.SUCCESS)
                .photos(res)
                .build();
    }

    /**
     * DELETE /api/v1/contests/{contestId}/modelPhoto/{modelPhotoId}
     * - 作成者のみ削除OK
     * - DB削除後にS3削除（ベストエフォート、失敗は握りつぶし）
     */
    @Transactional
    public ContestModelPhotoListResponse delete(Long contestId, Long modelPhotoId, String requesterUserId) {
        Contest contest = contestMapper.findById(contestId)
                .orElse(null);
        if (contest == null) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.CONTEST_NOT_FOUND)
                    .photos(List.of())
                    .build();
        }

        String ownerUserId = contest.getCreatedByUserId();
        if (ownerUserId == null || !ownerUserId.equals(requesterUserId)) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.FORBIDDEN)
                    .photos(List.of())
                    .build();
        }


        ContestModelPhoto existing = contestModelPhotoMapper.findById(modelPhotoId);
        if (existing == null || existing.getContestId() == null || !existing.getContestId().equals(contestId)) {
            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.MODEL_PHOTO_NOT_FOUND)
                    .photos(List.of())
                    .build();
        }

        try {
            contestModelPhotoMapper.deleteById(modelPhotoId);

            // DBは消したので、S3はベストエフォートで消す（失敗は握りつぶし）
            bestEffortDeleteS3(existing.getPhotoUrl());

            ContestModelPhotoCreateResponse body = ContestModelPhotoCreateResponse.builder()
                    .id(existing.getId())
                    .contestId(existing.getContestId())
                    .key(existing.getPhotoUrl())
                    .title(existing.getTitle())
                    .description(existing.getDescription())
                    .createdAt(existing.getCreatedAt())
                    .build();

            return ContestModelPhotoListResponse.builder()
                    .status(ContestModelPhotoCreateStatus.SUCCESS)
                    .photos(List.of(body))
                    .build();

        } catch (Exception e) {
            throw new DatabaseOperationException("Failed to delete contest model photo. contestId=" + contestId, e);
        }
    }

    private void bestEffortDeleteS3(String key) {
        if (isBlank(key)) return;
        try {
            s3DeleteService.delete(key);
        } catch (Exception s3e) {
            // ★握りつぶす：ロールバック（またはDB操作）を優先
            log.warn("Best-effort S3 delete failed. key={}", key, s3e);
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}