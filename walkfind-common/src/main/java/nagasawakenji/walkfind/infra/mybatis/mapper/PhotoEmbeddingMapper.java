package nagasawakenji.walkfind.infra.mybatis.mapper;

import nagasawakenji.walkfind.domain.dto.PhotoEmbeddingRow;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PhotoEmbeddingMapper {

    // モデル写真との類似度計算結果を返す
    List<SimilarModelPhotoRow> findSimilarList(@Param("contestId") Long contestId, @Param("userPhotoId") Long userPhotoId, @Param("limit") Integer limit);

    boolean existsUserEmbeddingReady(@Param("contestId") Long contestId, @Param("userPhotoId") Long userPhotoId);

    boolean existsAnyModelEmbeddingReadyForContest(@Param("contestId") Long contestId);

    String findLatestUserEmbeddingModelVersion(@Param("contestId") Long contestId, @Param("userPhotoId") Long userPhotoId);

    // USER statusのembeddingを削除する
    int deleteUserEmbeddingById(@Param("contestId") Long contestId, @Param("userPhotoId") Long userPhotoId);

    // MODEL statusのembeddingを削除する
    int deleteModelEmbeddingById(@Param("contestId") Long contestId, @Param("modelPhotoId") Long modelPhotoId);

    List<Long> findReadyUserPhotoIds(@Param("contestId") Long contestId,
                                     @Param("photoIds") List<Long> photoIds);

    PhotoEmbeddingRow findReadyUserEmbedding(
            @Param("contestId") Long contestId,
            @Param("userPhotoId") Long userPhotoId,
            @Param("modelVersion") String modelVersion
    );

    List<PhotoEmbeddingRow> findReadyModelEmbeddingsForContest(
            @Param("contestId") Long contestId,
            @Param("modelVersion") String modelVersion
    );

}
