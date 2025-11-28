// src/app/page.tsx
export const dynamic = "force-dynamic";
import Link from 'next/link';
import { apiClient } from '@/lib/axios';
import { ContestResponse } from '@/types';

// データの取得処理 (Server Component)
async function getContests(): Promise<ContestResponse[]> {
  try {
    // 実際のリクエスト: http://localhost:8080/api/v1/contests
    return await apiClient.get('/contests');
  } catch (error) {
    console.error("Failed to fetch contests:", error);
    return [];
  }
}

export default async function HomePage() {
  const contests = await getContests();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">開催中のフォトコンテスト</h1>

      {contests.length === 0 ? (
        <p className="text-center text-gray-500">現在開催中のコンテストはありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <Link 
              href={`/contests/${contest.contestId}`} 
              key={contest.contestId}
              className="block group"
            >
              <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 bg-white">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {/* サムネイルがあれば画像を表示、なければプレースホルダー */}
                  <span className="text-4xl">📷</span>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {contest.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      ~ {new Date(contest.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600">
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
      )}
    </main>
  );
}