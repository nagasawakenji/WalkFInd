// src/app/contests/announced/[id]/page.tsx
export const dynamic = "force-dynamic";

import Image from "next/image";
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
  searchParams?: { page?: string; size?: string };
};

export default async function AnnouncedContestDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const contestId = resolvedParams.id;

  const page = Number(searchParams?.page ?? 0);
  const size = Number(searchParams?.size ?? 12);

  const contest = await getContestDetail(contestId);
  const { items: results, totalCount } = await getContestResults(contestId, page, size);
  const winners = await getContestWinners(contestId);

  const totalPages = Math.ceil(totalCount / size);

  if (!contest) {
    notFound();
  }

  const totalSubmissions = totalCount;

  return (
    <main className="container mx-auto px-4 py-10 space-y-12">

      {/* ---------------- コンテスト概要 ---------------- */}
      <section className="bg-white rounded-lg shadow-lg p-8 space-y-4">
        <h1 className="text-4xl font-bold">{contest.name}</h1>

        <p className="text-gray-600">
          テーマ：<span className="font-semibold">{contest.theme}</span>
        </p>

        <p className="text-sm text-gray-500">
          開催期間：
          {new Date(contest.startDate).toLocaleDateString()} 〜{" "}
          {new Date(contest.endDate).toLocaleDateString()}
        </p>

        <p className="text-sm text-gray-500">
          投稿数：{totalSubmissions} 作品
        </p>
      </section>

      {/* ---------------- 優勝作品 ---------------- */}
      {winners.length > 0 && (
        <section className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-10 space-y-8 shadow-xl">
          <h2 className="text-3xl font-bold text-yellow-700">
            🏆 優勝作品（{winners.length}作品）
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {winners.map((winner) => (
              <div key={winner.photoId} className="space-y-3">
                <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={winner.photoUrl}
                    alt={winner.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-bold">{winner.title}</p>
                  <p className="text-gray-600">投稿者：{winner.username}</p>
                  <p className="text-gray-600">得票数：{winner.finalScore} 票</p>
                  <p className="text-gray-500 text-sm">
                    投稿日：{new Date(winner.submissionDate).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- 最終ランキング ---------------- */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">📊 最終ランキング</h2>

        {results.length === 0 ? (
          <p className="text-gray-500">投稿がありませんでした。</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results
              .filter(result => !winners.some(w => w.photoId === result.photoId))
              .map(result => (
              <div
                key={result.photoId}
                className={`border rounded-lg shadow-sm overflow-hidden ${
                  result.isWinner ? "border-yellow-400" : ""
                }`}
              >
                <div className="relative h-56 w-full bg-gray-200">
                  <Image
                    src={result.photoUrl}
                    alt={result.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                <div className="p-4 space-y-1">
                  <p className="text-lg font-bold">
                    {result.finalRank} 位：{result.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    投稿者：{result.username}
                  </p>
                  <p className="text-sm text-gray-600">
                    得票数：{result.finalScore} 票
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 pt-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <a
                key={i}
                href={`/contests/announced/${contestId}?page=${i}&size=${size}`}
                className={`px-4 py-2 border rounded ${
                  i === page ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                {i + 1}
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}