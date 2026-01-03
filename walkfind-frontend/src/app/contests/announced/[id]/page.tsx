export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { ContestDetailResponse, ContestResultResponse, ContestWinnerDto, ContestWinnerListResponse } from "@/types";

// ----------------------
// API取得
// ----------------------

async function getContestDetail(id: string): Promise<ContestDetailResponse | null> {
  try {
    return await apiClient.get(`/contests/${id}`);
  } catch {
    return null;
  }
}

async function getContestResults(id: string, page: number, size: number): Promise<{ items: ContestResultResponse[]; totalCount: number }> {
  try {
    return await apiClient.get(`/results/${id}?page=${page}&size=${size}`);
  } catch {
    return { items: [], totalCount: 0 };
  }
}

async function getContestWinners(id: string): Promise<ContestWinnerDto[]> {
  try {
    const res: ContestWinnerListResponse = await apiClient.get(
      `/results/${id}/winner`
    );
    return res.winners ?? [];
  } catch {
    return [];
  }
}

// ----------------------
// Page Component
// ----------------------

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; size?: string }>;
};

export default async function AnnouncedContestDetailPage({ params, searchParams }: PageProps) {
  const { id: contestId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const page = Number(resolvedSearchParams.page ?? 0);
  const size = Number(resolvedSearchParams.size ?? 12);

  const contest = await getContestDetail(contestId);
  const { items: results, totalCount } = await getContestResults(contestId, page, size);
  const safeResults = Array.isArray(results) ? results : [];
  const winners = await getContestWinners(contestId);

  const totalPages = Math.ceil(totalCount / size);

  if (!contest) {
    notFound();
  }

  const totalSubmissions = totalCount;

  // Similarityページへのリンク生成
  const similarityPageHref = (photoId: number | string) => `/contests/${contestId}/photos/${photoId}/similarity`;

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href="/contests/announced" className="text-sm text-gray-300 hover:text-white">
          Announced Contests
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white font-medium">{contest.name} Results</span>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-8">

        {/* ---------------- コンテスト概要パネル ---------------- */}
        <div className="bg-white rounded-sm border border-gray-300 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                <span className="text-3xl">🏁</span> {contest.name}
                <span className="text-sm font-normal text-gray-500 ml-2">- Results</span>
              </h1>

              <Link
                href={`/results/${contestId}`}
                className="inline-block px-4 py-2 bg-black text-white text-xs font-bold rounded-sm hover:bg-gray-800 transition-colors"
              >
                結果詳細へ
              </Link>
            </div>
            <div className="mt-2 md:mt-0 px-3 py-1 bg-gray-100 border border-gray-200 text-xs font-bold text-gray-600 rounded-sm">
              Total Submissions: {totalSubmissions}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <h2 className="font-bold text-gray-500 uppercase text-xs mb-1">Theme</h2>
              <p className="text-lg font-bold text-gray-800">{contest.theme}</p>
            </div>
            <div>
               <h2 className="font-bold text-gray-500 uppercase text-xs mb-1">Period</h2>
               <p className="font-mono text-gray-700">
                {new Date(contest.startDate).toLocaleDateString()} 〜 {new Date(contest.endDate).toLocaleDateString()}
               </p>
            </div>
          </div>
        </div>

        {/* ---------------- 優勝作品エリア ---------------- */}
        {winners.length > 0 && (
          <div className="bg-white border-l-4 border-yellow-500 border-y border-r border-gray-300 rounded-r-sm shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
              <span className="text-3xl">🏆</span> 優勝作品
              <span className="text-sm font-normal text-gray-500 ml-2">Winner Selection</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {winners.map((winner) => (
                <div key={winner.photoId} className="group">
                   {/* 写真枠: 金色のボーダーで強調 */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 border-2 border-yellow-400 rounded-sm overflow-hidden mb-3 shadow-md">
                    <Image
                      src={winner.photoUrl}
                      alt={winner.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                     <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 shadow-sm">
                       WINNER
                     </div>
                  </div>

                  <div className="space-y-2 px-1">
                    <p className="text-lg font-bold text-gray-900 leading-tight group-hover:text-yellow-600 transition-colors">
                      {winner.title}
                    </p>

                    <div className="flex items-center justify-between">
                      <Link
                        href={similarityPageHref(winner.photoId)}
                        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 border border-gray-300 rounded-sm bg-white hover:bg-gray-50"
                      >
                        🧭 Similarity
                        <span className="text-gray-400 font-mono">(PCA)</span>
                      </Link>
                      <span className="text-[11px] text-gray-400">※ ログインが必要な場合があります</span>
                    </div>

                    <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-2 mt-2">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5">Photographer</p>
                            {winner.userId ? (
                            <Link
                                href={`/users/${winner.userId}`}
                                className="text-sm font-bold text-blue-600 hover:underline"
                            >
                                {winner.username}
                            </Link>
                            ) : (
                            <span className="text-sm font-bold text-gray-400">{winner.username}</span>
                            )}
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500 mb-0.5">Score</p>
                             <p className="text-lg font-bold text-black font-mono">{winner.finalScore}</p>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- 最終ランキング一覧 ---------------- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-300 pb-2">
            <span className="text-gray-400">📊</span> 最終ランキング
          </h2>

          <div className="mb-4 bg-white border border-gray-300 rounded-sm p-4 text-sm text-gray-700">
            <div className="font-bold text-black mb-1">🧠 Similarity（類似度）</div>
            <div className="text-gray-600">
              各写真の <span className="font-mono">Similarity</span> から、モデル写真との近さ（embedding + PCA可視化）を確認できます。
            </div>
          </div>

          {safeResults.length === 0 ? (
             <div className="bg-white border border-gray-300 p-8 text-center text-gray-500 rounded-sm">
                投稿がありませんでした。
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeResults
                .filter(result => !winners.some(w => w.photoId === result.photoId))
                .map(result => (
                <div
                  key={result.photoId}
                  className="bg-white border border-gray-300 rounded-sm hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full bg-gray-200 border-b border-gray-200">
                    <Image
                      src={result.photoUrl}
                      alt={result.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-sm font-bold font-mono rounded-sm backdrop-blur-sm">
                       #{result.finalRank}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <p className="text-base font-bold text-gray-900 mb-2 line-clamp-1">{result.title}</p>

                    <div className="mb-3">
                      <Link
                        href={similarityPageHref(result.photoId)}
                        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 border border-gray-300 rounded-sm bg-white hover:bg-gray-50"
                      >
                        🧭 Similarity
                        <span className="text-gray-400 font-mono">(PCA)</span>
                      </Link>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            by 
                            {result.userId ? (
                            <Link
                                href={`/users/${result.userId}`}
                                className="font-bold hover:underline hover:text-black"
                            >
                                {result.username}
                            </Link>
                            ) : (
                            <span className="text-gray-400">{result.username}</span>
                            )}
                        </div>
                        <div className="text-sm font-mono">
                            <span className="font-bold text-black">{result.finalScore}</span> <span className="text-xs text-gray-400">pts</span>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-12">
              {Array.from({ length: totalPages }).map((_, i) => (
                <a
                  key={i}
                  href={`/contests/announced/${contestId}?page=${i}&size=${size}`}
                  className={`px-4 py-2 border rounded-sm text-sm font-mono transition-colors ${
                    i === page 
                      ? "bg-black text-white border-black" 
                      : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}