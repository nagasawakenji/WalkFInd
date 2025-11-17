package nagasawakenji.walkfind.domain.statusenum;

/**
 * 結果集計処理（定期実行）の結果を示すEnum。
 */
public enum CalculationStatus {
    SUCCESS,                    // 正常終了（結果を書き込み完了）
    NO_CONTESTS_TO_CALCULATE,   // 集計対象のコンテストがない
    ALREADY_CALCULATED,         // 既に集計済みである
    FAILED_DATABASE_ERROR       // DB集計または書き込み中にエラーが発生した
}