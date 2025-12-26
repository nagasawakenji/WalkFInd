package nagasawakenji.walkfind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoItem;
import nagasawakenji.walkfind.domain.dto.SimilarModelPhotoRow;
import nagasawakenji.walkfind.domain.dto.SimilaritySummary;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@Slf4j
@RequiredArgsConstructor
public class SimilarModelPhotoInsightService {

    private final SimilarModelPhotoService similarModelPhotoService;

    /**
     * 統計情報計算（statusがSUCCESSの場合に rows を渡して呼び出す想定）
     * - avgTop3: Top3の平均（TopKが3未満ならある分だけ平均）
     * - maxSimilarity: 最大値
     * - matchScore: 0-100 のスコア（0.7*max + 0.3*avgTop3）
     */
    public SimilaritySummary calcSummary(List<SimilarModelPhotoItem> rows) {

        // rowsが空で渡されることがあった場合、全ての値を0として返却する
        if (rows == null || rows.isEmpty()) {
            return SimilaritySummary.builder()
                    .avgTop3(0.0)
                    .maxSimilarity(0.0)
                    .matchScore(0)
                    .build();
        }

        // similarity が null の行は除外しつつ、降順に並べる
        List<Double> scores = rows.stream()
                .map(SimilarModelPhotoItem::getSimilarity)
                .filter(Objects::nonNull)
                .sorted(Comparator.reverseOrder())
                .toList();

        if (scores.isEmpty()) {
            return SimilaritySummary.builder()
                    .avgTop3(0.0)
                    .maxSimilarity(0.0)
                    .matchScore(0)
                    .build();
        }

        double maxSimilarity = scores.get(0);
        double avgTop3 = scores.stream()
                .limit(3)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        int matchScore = (int) Math.round(100.0 * (0.7 * maxSimilarity + 0.3 * avgTop3));
        if (matchScore < 0) matchScore = 0;
        if (matchScore > 100) matchScore = 100;

        return SimilaritySummary.builder()
                .avgTop3(avgTop3)
                .maxSimilarity(maxSimilarity)
                .matchScore(matchScore)
                .build();
    }


}
