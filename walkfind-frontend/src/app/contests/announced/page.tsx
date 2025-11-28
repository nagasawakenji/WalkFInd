

// src/app/contests/announced/page.tsx
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
  searchParams?: {
    page?: string;
  };
};

export default async function AnnouncedContestPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page ?? "0");
  const size = 20;

  const contests = await getAnnouncedContests(page, size);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">結果発表済みコンテスト</h1>

      {contests.length === 0 ? (
        <p className="text-center text-gray-500">結果発表済みのコンテストはありません。</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => (
              <Link
                href={`/contests/${contest.contestId}`}
                key={contest.contestId}
                className="block group"
              >
                <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 bg-white">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                        {contest.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(contest.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-green-700">
                      {contest.name}
                    </h2>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      テーマ: {contest.theme}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* ページング */}
          <div className="flex justify-center items-center gap-4 mt-10">
            {page > 0 && (
              <Link
                href={`/contests/announced?page=${page - 1}`}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                前へ
              </Link>
            )}

            <span className="text-sm text-gray-600">ページ {page + 1}</span>

            {contests.length === size && (
              <Link
                href={`/contests/announced?page=${page + 1}`}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                次へ
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  );
}