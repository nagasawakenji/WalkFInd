// src/app/contests/announced/[id]/page.tsx

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { 
  ContestDetailResponse, 
  ContestResultResponse, 
  ContestWinnerDto, 
  ContestWinnerListResponse 
} from "@/types";

// --- 型定義 (モデル写真用) ---
type ModelPhotoItem = {
  id: number;
  title: string;
  description: string | null;
  key: string; // バックエンドからは key が返ってくると想定
  photoUrl?: string; // 表示用に解決したURL
};

type ModelPhotoListResponse = {
  status: string;
  photos: ModelPhotoItem[];
};

type PresignedUrlResponse = {
  key: string;
  photoUrl: string;
};

// ----------------------
// API取得関数
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

// ★ 追加: モデル写真の取得とURL解決
async function getModelPhotos(contestId: string): Promise<ModelPhotoItem[]> {
  try {
    // 1. リスト取得
    const res: ModelPhotoListResponse = await apiClient.get(`/contests/${contestId}/modelPhoto`);
    const photos = res.photos ?? [];

    if (photos.length === 0) return [];

    // 2. 環境に応じたURL解決 (Local / S3)
    const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // 並列でURLを解決
    const resolvedPhotos = await Promise.all(
      photos.map(async (photo) => {
        try {
          if (!photo.key) return { ...photo, photoUrl: null };

          if (IS_LOCAL) {
            // ローカル環境
            return { 
              ...photo, 
              photoUrl: `${API_BASE_URL}/local-storage/${encodeURIComponent(photo.key)}` 
            };
          } else {
            // 本番環境 (Presigned URL取得)
            const presignRes = await apiClient.get<PresignedUrlResponse>('/upload/presigned-download-url', {
              params: { key: photo.key },
            });
            return { ...photo, photoUrl: presignRes.data.photoUrl };
          }
        } catch (e) {
          console.error(`Failed to resolve url for model photo ${photo.id}`, e);
          return { ...photo, photoUrl: null };
        }
      })
    );

    // URLが取得できたものだけ返す、あるいはNoImage表示用に残す（今回は残す）
    return resolvedPhotos as ModelPhotoItem[];

  } catch (error) {
    console.error("Failed to fetch model photos:", error);
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

  // 並列取得 (パフォーマンス向上)
  const [contest, resultsData, winners, modelPhotos] = await Promise.all([
    getContestDetail(contestId),
    getContestResults(contestId, page, size),
    getContestWinners(contestId),
    getModelPhotos(contestId), // ★ 追加
  ]);

  const { items: results, totalCount } = resultsData;
  const safeResults = Array.isArray(results) ? results : [];
  const totalPages = Math.ceil(totalCount / size);

  if (!contest) {
    notFound();
  }

  const totalSubmissions = totalCount;
  // 優勝者リストに含まれるphotoIdを除外
  const rankingList = safeResults.filter(result => !winners.some(w => w.photoId === result.photoId));

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* 共通ナビゲーションバー */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors shrink-0">
                WalkFind
                </Link>
                <span className="text-gray-300 shrink-0">/</span>
                <Link href="/contests/announced" className="text-sm font-medium text-gray-500 hover:text-black transition-colors shrink-0">
                Announced
                </Link>
                <span className="text-gray-300 shrink-0">/</span>
                <span className="text-sm font-medium text-black truncate">{contest.name}</span>
            </div>
        </div>
      </nav>

      {/* コンテンツエリア */}
      <div className="pt-24 max-w-6xl mx-auto px-4 space-y-16">

        {/* ヘッダーエリア */}
        <div className="text-center py-8 md:py-12 border-b border-gray-200">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wider mb-4 uppercase border border-blue-100">
                Contest Results
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-black mb-4 tracking-tight leading-tight">
                {contest.name}
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
                Theme: <span className="text-black font-semibold">{contest.theme}</span>
            </p>
            
            <div className="flex justify-center items-center gap-4 text-sm text-gray-400 font-mono">
                <div className="px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
                    Total Submissions: <b className="text-black">{totalSubmissions}</b>
                </div>
                <div className="px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm hidden sm:block">
                    {new Date(contest.startDate).toLocaleDateString()} — {new Date(contest.endDate).toLocaleDateString()}
                </div>
            </div>
        </div>

        {/* ---------------- 優勝作品エリア ---------------- */}
        {winners.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8 justify-center">
                <span className="text-2xl">🏆</span>
                <h2 className="text-2xl font-bold tracking-tight text-black">Grand Winner</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {winners.map((winner) => (
                <div key={winner.photoId} className="group relative bg-white rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  <div className="relative aspect-[4/3] w-full bg-gray-100">
                    <Image
                      src={winner.photoUrl}
                      alt={winner.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                     
                     <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg text-xs font-black px-3 py-1.5 rounded-full tracking-widest flex items-center gap-1 border border-white/20">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        WINNER
                     </div>

                     <div className="absolute bottom-0 left-0 p-6 w-full text-white">
                        <h3 className="text-2xl font-bold mb-2 leading-tight text-white drop-shadow-md">
                            {winner.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm font-medium text-gray-200">
                            <div className="flex items-center gap-2">
                                <span className="opacity-75">Photographer</span>
                                {winner.userId ? (
                                    <Link href={`/users/${winner.userId}`} className="text-white hover:underline decoration-yellow-400 underline-offset-4 font-bold">
                                        {winner.username}
                                    </Link>
                                ) : (
                                    <span>{winner.username}</span>
                                )}
                            </div>
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-white font-mono font-bold">
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

        {/* ---------------- ランキング一覧 ---------------- */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🏆 Final Rankings
            </h2>
            <Link 
                href={`/results/${contestId}`} 
                className="text-sm font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
                View Details <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {rankingList.length === 0 ? (
             <div className="py-24 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-bold">まだランキング情報がありません。</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {rankingList.map(result => (
                <div key={result.photoId} className="group flex flex-col bg-transparent">
                  {/* ... (ランキングカードの実装、元のコードと同じ) ... */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 cursor-pointer">
                    <Image
                      src={result.photoUrl}
                      alt={result.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-white px-3 py-1 text-sm font-bold font-mono rounded-lg shadow-lg border border-white/10">
                       #{result.finalRank}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
                  </div>
                  <div className="mt-4 px-1">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-black transition-colors">{result.title}</p>
                        <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md ml-2 shrink-0 border border-gray-200">{result.finalScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1 truncate">
                            by 
                            {result.userId ? (
                            <Link href={`/users/${result.userId}`} className="font-medium text-gray-600 hover:text-black transition-colors hover:underline">
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

          {/* ページネーション (省略: 元のコードと同様) */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-16">
              {/* ... */}
            </div>
          )}
        </section>

        {/* ---------------- ★ 追加: モデル写真エリア ---------------- */}
        {modelPhotos.length > 0 && (
          <section className="pt-16 border-t border-gray-200">
            <div className="text-center mb-10">
               <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <span className="text-2xl">🖼️</span> Reference Model Photos
               </h2>
               <p className="text-sm text-gray-500">
                  find作成者が投稿したモデル写真です
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {modelPhotos.map((model) => (
                  <div key={model.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                     <div className="relative aspect-[4/3] bg-gray-100">
                        {model.photoUrl ? (
                           <Image
                              src={model.photoUrl}
                              alt={model.title}
                              fill
                              unoptimized
                              className="object-cover"
                           />
                        ) : (
                           <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
                           MODEL
                        </div>
                     </div>
                     <div className="p-4">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">{model.title}</h3>
                        {model.description && (
                           <p className="text-xs text-gray-500 line-clamp-2">{model.description}</p>
                        )}
                     </div>
                  </div>
               ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}