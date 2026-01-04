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

  // 優勝者リストに含まれるphotoIdを除外して、一般ランキング表示用リストを作成
  const rankingList = safeResults.filter(result => !winners.some(w => w.photoId === result.photoId));

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* 共通ナビゲーションバー（シンプル化） */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 h-14 flex items-center px-4 lg:px-8 shadow-sm">
        <Link href="/" className="font-bold text-xl tracking-tighter text-black hover:text-gray-600 transition-colors">
          WalkFind
        </Link>
        <span className="mx-3 text-gray-300">/</span>
        <Link href="/contests/announced" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          Announced
        </Link>
        <span className="mx-3 text-gray-300">/</span>
        <span className="text-sm font-medium text-black truncate">{contest.name}</span>
      </nav>

      {/* ヘッダーエリア */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
            <span className="inline-block py-1 px-3 rounded-full bg-gray-100 text-gray-500 text-xs font-bold tracking-wider mb-4 uppercase">
                Contest Results
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-black mb-4 tracking-tight">
                {contest.name}
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
                Theme: <span className="text-black font-semibold">{contest.theme}</span>
            </p>
            
            <div className="flex justify-center items-center gap-6 text-sm text-gray-400 font-mono">
                <span>Total Submissions: <b className="text-black">{totalSubmissions}</b></span>
                <span className="w-px h-4 bg-gray-300"></span>
                <span>{new Date(contest.startDate).toLocaleDateString()} — {new Date(contest.endDate).toLocaleDateString()}</span>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12 space-y-16">

        {/* ---------------- 優勝作品エリア（リッチデザイン） ---------------- */}
        {winners.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8 justify-center">
                <span className="text-2xl">🏆</span>
                <h2 className="text-2xl font-bold tracking-tight text-black">Grand Winner</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {winners.map((winner) => (
                <div key={winner.photoId} className="group relative bg-white rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                   {/* 画像 */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100">
                    <Image
                      src={winner.photoUrl}
                      alt={winner.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                     {/* 金色のオーバーレイグラデーション */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                     
                     {/* 順位バッジ */}
                     <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 shadow-lg text-xs font-black px-3 py-1.5 rounded-full tracking-widest flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        WINNER
                     </div>

                     {/* 画像内テキスト（没入感のため画像の上に配置） */}
                     <div className="absolute bottom-0 left-0 p-6 w-full text-white">
                        <h3 className="text-2xl font-bold mb-2 leading-tight text-white drop-shadow-md">
                            {winner.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm font-medium text-gray-200">
                            <div className="flex items-center gap-2">
                                <span className="opacity-75">Photographer</span>
                                {winner.userId ? (
                                    <Link href={`/users/${winner.userId}`} className="text-white hover:underline decoration-yellow-400 underline-offset-4">
                                        {winner.username}
                                    </Link>
                                ) : (
                                    <span>{winner.username}</span>
                                )}
                            </div>
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-white font-mono">
                                {winner.finalScore} pts
                            </div>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- ランキング一覧（ミニマルデザイン） ---------------- */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🏆 Final Rankings
            </h2>
            <Link 
                href={`/results/${contestId}`} 
                className="text-sm font-semibold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
                View Details <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {rankingList.length === 0 ? (
             <div className="py-20 text-center bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">まだランキング情報がありません。</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {rankingList.map(result => (
                <div
                  key={result.photoId}
                  className="group flex flex-col bg-transparent"
                >
                  {/* カード画像部分 */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-lg overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 cursor-pointer">
                    <Image
                      src={result.photoUrl}
                      alt={result.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* ランクバッジ */}
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white px-2.5 py-1 text-sm font-bold font-mono rounded-md shadow-lg border border-white/10">
                       #{result.finalRank}
                    </div>

                    {/* ホバー時のオーバーレイ（PCのみ） */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
                  </div>

                  {/* カード下部情報 */}
                  <div className="mt-4 px-1">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-black">
                            {result.title}
                        </p>
                        <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md ml-2 shrink-0">
                            {result.finalScore}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1 truncate">
                            by 
                            {result.userId ? (
                            <Link
                                href={`/users/${result.userId}`}
                                className="font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                {result.username}
                            </Link>
                            ) : (
                            <span className="text-gray-400">{result.username}</span>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ページネーション（モダン化） */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-16">
              {Array.from({ length: totalPages }).map((_, i) => (
                <a
                  key={i}
                  href={`/contests/announced/${contestId}?page=${i}&size=${size}`}
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full text-sm font-mono transition-all duration-200
                    ${i === page 
                      ? "bg-black text-white shadow-md scale-110" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }
                  `}
                >
                  {i + 1}
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}