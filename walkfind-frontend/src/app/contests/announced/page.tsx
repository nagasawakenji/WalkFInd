export const dynamic = "force-dynamic";

import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { ContestResponse } from "@/types";
import ContestIcon from "@/components/ContestIcon";

// ページング付きで結果発表済みコンテストを取得
async function getAnnouncedContests(page: number, size: number): Promise<ContestResponse[]> {
  try {
    return await apiClient.get(`/contests/announced?page=${page}&size=${size}`);
  } catch (error) {
    console.error("Failed to fetch announced contests:", error);
    return [];
  }
}

type PageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function AnnouncedContestPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "0");
  const size = 18;

  const contests = await getAnnouncedContests(page, size);

  // 次のページがあるかどうかの簡易判定（取得数がsizeと同じなら次がある可能性が高い）
  const hasNextPage = contests.length === size;

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* 共通ナビゲーションバー（統一デザイン） */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
             WalkFind
          </Link>
          <div className="text-sm font-medium text-gray-500">
             Archive
          </div>
        </div>
      </nav>

      <div className="pt-24 max-w-7xl mx-auto px-4">
        
        {/* ヘッダーエリア */}
        <div className="mb-12 text-center md:text-left border-b border-gray-200 pb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-3 tracking-tight">
               Past Results
            </h1>
            <p className="text-gray-500 max-w-2xl text-sm md:text-base">
               過去に開催されたfindです。<br className="hidden md:inline"/>
               過去のfindから何が見つかったかをみてみましょう!!
            </p>
        </div>

        {contests.length === 0 ? (
            <div className="py-24 text-center bg-white border border-dashed border-gray-300 rounded-xl">
              <div className="text-4xl mb-4 text-gray-300">📂</div>
              <p className="text-lg font-bold text-gray-700 mb-1">No Archives Found</p>
              <p className="text-sm text-gray-500">結果発表済みのコンテストはまだありません。</p>
            </div>
        ) : (
            <>
              {/* グリッドレイアウト */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {contests.map((contest) => (
                  <Link
                    key={contest.contestId}
                    href={`/contests/announced/${contest.contestId}`} // 詳細ページへ
                    className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-black/10 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* アイコン/画像エリア */}
                    <div className="h-48 bg-gray-100 relative flex items-center justify-center overflow-hidden">
                       <div className="transition-transform duration-500 group-hover:scale-110">
                          <ContestIcon iconUrl={contest.iconUrl ?? null} size={100} />
                       </div>
                       
                       {/* ステータスバッジ（右上） */}
                       <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                          FINISHED
                       </div>
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex-grow">
                          {/* 日付 */}
                          <div className="text-xs font-mono text-gray-400 mb-2">
                             Ended: {new Date(contest.endDate).toLocaleDateString()}
                          </div>
                          
                          {/* タイトル */}
                          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-black transition-colors line-clamp-2">
                             {contest.name}
                          </h2>
                          
                          {/* テーマ */}
                          <p className="text-sm text-gray-500 line-clamp-2">
                             <span className="font-bold text-gray-400 mr-1 text-xs uppercase tracking-wider">Theme:</span>
                             {contest.theme}
                          </p>
                      </div>
                      
                      {/* 下部アクション */}
                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-400 group-hover:text-black transition-colors">
                            View Results
                         </span>
                         <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                            &rarr;
                         </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ページネーション（モダン円形） */}
              <div className="flex justify-center items-center gap-3 mt-16 pb-8">
                {page > 0 ? (
                  <Link
                    href={`/contests/announced?page=${page - 1}`}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                  >
                    &larr;
                  </Link>
                ) : (
                  <button disabled className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full text-gray-300 cursor-not-allowed">
                    &larr;
                  </button>
                )}

                <div className="text-sm font-mono font-bold text-gray-500">
                   Page {page + 1}
                </div>

                {hasNextPage ? (
                  <Link
                    href={`/contests/announced?page=${page + 1}`}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                  >
                    &rarr;
                  </Link>
                ) : (
                  <button disabled className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full text-gray-300 cursor-not-allowed">
                    &rarr;
                  </button>
                )}
              </div>
            </>
        )}
      </div>
    </main>
  );
}