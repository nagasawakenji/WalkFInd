package nagasawakenji.WalkFind.service;

import nagasawakenji.WalkFind.domain.dto.PhotoResponse;
import nagasawakenji.WalkFind.infra.mybatis.mapper.ContestMapper;
import nagasawakenji.WalkFind.infra.mybatis.mapper.PhotoMapper;
import nagasawakenji.WalkFind.exception.ContestNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoDisplayService {

    private final PhotoMapper photoMapper;
    private final ContestMapper contestMapper; // コンテストの存在確認用

    /**
     * 特定のコンテストに投稿された全ての写真リストを取得する。
     * 多数のユーザーがアクセスするため、リードオンリーで高速なクエリを使用する。
     *
     * @param contestId 表示対象のコンテストID
     * @return 投稿写真のリスト (PhotoResponse DTO)
     */
    @Transactional(readOnly = true)
    public List<PhotoResponse> getPhotosByContest(Long contestId) {

        // コンテストの存在確認
        if (contestMapper.findById(contestId).isEmpty()) {
            throw new ContestNotFoundException("Contest with ID " + contestId + " not found.", "NOT_FOUND");
        }

        // DBからデータを取得
        // PhotoMapper.xml内で user_photos と users をJOINし、投票数順でソートするクエリが実行される
        List<PhotoResponse> photos = photoMapper.findAllPhotosByContest(contestId);

        log.info("Found {} photos for contest ID {}.", photos.size(), contestId);

        return photos;
    }
}