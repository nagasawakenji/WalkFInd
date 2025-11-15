package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.*;
import nagasawakenji.walkfind.domain.model.Contest;
import nagasawakenji.walkfind.domain.model.ContestModelPhoto;
import nagasawakenji.walkfind.domain.statusenum.ModelPhotoStatus;
import nagasawakenji.walkfind.exception.DatabaseOperationException;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.walkfind.infra.mybatis.mapper.ContestModelPhotoMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestModelPhotoService {

    private final ContestMapper contestMapper;
    private final ContestModelPhotoMapper contestModelPhotoMapper;

    /**
     * 管理者用: モデル写真の追加
     */
    @Transactional
    public ModelPhotoCreateResponse addModelPhoto(Long contestId, ModelPhotoCreateRequest request) {

        // コンテスト存在確認
        Optional<Contest> contest = contestMapper.findById(contestId);
        if (contest.isEmpty()) {
            return ModelPhotoCreateResponse.builder()
                    .status(ModelPhotoStatus.FAILED)
                    .message("指定されたコンテストが存在しません")
                    .build();
        }

        // モデル写真エンティティ作成
        ContestModelPhoto photo = new ContestModelPhoto();
        photo.setContestId(contestId);
        photo.setPhotoUrl(request.getPhotoUrl());
        photo.setTitle(request.getTitle());
        photo.setDescription(request.getDescription());
        photo.setCreatedAt(OffsetDateTime.now());

        try {
            int inserted = contestModelPhotoMapper.insert(photo);

            if (inserted == 0) {
                log.error("Failed to insert model photo");
                throw new DatabaseOperationException("モデル写真の保存に失敗しました");
            }

            return ModelPhotoCreateResponse.builder()
                    .status(ModelPhotoStatus.SUCCESS)
                    .modelPhotoId(photo.getId())
                    .title(photo.getTitle())
                    .message("モデル写真を登録しました")
                    .build();

        } catch (Exception e) {
            log.error("DB error when inserting model photo", e);
            throw new RuntimeException("モデル写真登録中にエラーが発生しました", e);
        }
    }

    /**
     * 一般ユーザー: コンテストに紐づくモデル写真一覧を DTO リストで返す
     */
    @Transactional(readOnly = true)
    public List<ModelPhotoResponse> getModelPhotos(Long contestId) {

        List<ContestModelPhoto> photos = contestModelPhotoMapper.findByContestId(contestId);

        return photos.stream()
                .map(photo -> ModelPhotoResponse.builder()
                        .id(photo.getId())
                        .title(photo.getTitle())
                        .description(photo.getDescription())
                        .photoUrl(photo.getPhotoUrl())
                        .createdAt(photo.getCreatedAt())  // ISO8601
                        .build()
                )
                .collect(Collectors.toList());
    }

    /**
     * 管理者用: モデル写真の削除
     */
    @Transactional
    public ModelPhotoDeleteResponse deleteModelPhoto(Long id) {

        int deleted = contestModelPhotoMapper.deleteById(id);

        if (deleted == 0) {
            return ModelPhotoDeleteResponse.builder()
                    .status(ModelPhotoStatus.FAILED)
                    .deletedPhotoId(id)
                    .message("指定されたモデル写真は存在しません")
                    .build();
        }

        return ModelPhotoDeleteResponse.builder()
                .status(ModelPhotoStatus.SUCCESS)
                .deletedPhotoId(id)
                .message("モデル写真を削除しました")
                .build();
    }
}