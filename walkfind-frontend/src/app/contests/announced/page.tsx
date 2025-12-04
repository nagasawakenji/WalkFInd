export const dynamic = "force-dynamic";

import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { ContestResponse } from "@/types";

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
  // Next.js 15対応: searchParamsをawaitする
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? "0");
  const size = 18; // グリッド表示に合わせて調整

  const contests = await getAnnouncedContests(page, size);

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white font-medium">Announced Contests</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        
        {/* 大きな白いパネル（画像のような外枠） */}
        <div className="bg-white border border-gray-200 rounded-sm p-8 shadow-sm">
            
            {/* パネル内ヘッダー */}
            <div className="mb-8 border-b border-gray-100 pb-4">
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                    結果発表済みコンテスト
                </h1>
            </div>

            {contests.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
                <p className="text-lg mb-2">結果発表済みのコンテストはありません。</p>
                <p className="text-sm font-mono text-gray-400">No archived contests found.</p>
            </div>
            ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contests.map((contest) => (
                    <div
                    key={contest.contestId}
                    className="bg-white border border-blue-200 rounded-sm p-1 hover:shadow-md transition-shadow duration-200 flex flex-col h-full"
                    >
                        {/* 画像エリア（プレースホルダー） */}
                        <div className="h-40 bg-gray-50 border border-gray-100 flex items-center justify-center rounded-sm mb-3">
                            <span className="text-4xl text-gray-300">📷</span>
                        </div>

                        <div className="px-3 pb-4 flex flex-col flex-grow">
                            {/* ステータスと日付 */}
                            <div className="flex justify-between items-center mb-3 text-xs">
                                <span className="px-2 py-1 font-bold text-white bg-green-600 rounded-sm">
                                    {contest.status}
                                </span>
                                <span className="text-gray-500 font-mono">
                                    End: {new Date(contest.endDate).toLocaleDateString()}
                                </span>
                            </div>
                            
                            {/* タイトル（リンク） - 青文字でアンダーラインのホバー効果 */}
                            <Link 
                                href={`/contests/announced/${contest.contestId}`}
                                className="text-lg font-bold text-blue-600 hover:underline mb-4 line-clamp-2 block"
                            >
                                {contest.name}
                            </Link>
                            
                            {/* 点線区切り */}
                            <div className="border-t border-dashed border-gray-300 my-2 w-full"></div>

                            {/* テーマ表示 */}
                            <div className="mt-1 text-sm text-gray-600">
                                <span className="font-bold text-gray-400 uppercase mr-2 text-xs">THEME:</span>
                                {contest.theme}
                            </div>
                        </div>
                    </div>
                ))}
                </div>

                {/* ページング */}
                <div className="flex justify-center items-center gap-2 mt-12 pt-8 border-t border-gray-100">
                {page > 0 ? (
                    <Link
                    href={`/contests/announced?page=${page - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-sm hover:bg-gray-50 text-gray-700 transition"
                    >
                    &laquo; Prev
                    </Link>
                ) : (
                    <button disabled className="px-4 py-2 bg-gray-100 border border-gray-200 text-sm font-medium rounded-sm text-gray-400 cursor-not-allowed">
                    &laquo; Prev
                    </button>
                )}

                <div className="px-4 py-2 bg-white border border-gray-300 text-sm font-mono rounded-sm text-black min-w-[3rem] text-center">
                    {page + 1}
                </div>

                {contests.length === size ? (
                    <Link
                    href={`/contests/announced?page=${page + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-sm hover:bg-gray-50 text-gray-700 transition"
                    >
                    Next &raquo;
                    </Link>
                ) : (
                    <button disabled className="px-4 py-2 bg-gray-100 border border-gray-200 text-sm font-medium rounded-sm text-gray-400 cursor-not-allowed">
                    Next &raquo;
                    </button>
                )}
                </div>
            </>
            )}
        </div>
      </div>
    </main>
  );
}