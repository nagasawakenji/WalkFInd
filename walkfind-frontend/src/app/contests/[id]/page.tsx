// src/app/contests/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/axios';
import { ContestDetailResponse } from '@/types';

interface PageProps {
  params: {
    id: string;
  };
}


async function getContestDetail(id: string): Promise<ContestDetailResponse | null> {

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/contests/${id}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ContestDetailPage({ params }: PageProps) {
  const resolvedParams = await params;  

  const contest = await getContestDetail(resolvedParams.id);


  if (!contest) {
    notFound(); // 404ページを表示
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* ヘッダー部分 */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800">{contest.name}</h1>
          <span className="mt-2 md:mt-0 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
            {contest.status}
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">テーマ: {contest.theme}</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {contest.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 border-t pt-6">
          <div className="text-sm text-gray-500">
            <p>開始日: {new Date(contest.startDate).toLocaleString()}</p>
            <p>終了日: {new Date(contest.endDate).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* アクションボタンエリア */}
      {contest.status === "IN_PROGRESS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 投票・閲覧へ */}
          <Link 
            href={`/contests/${contest.contestId}/photos`}
            className="flex flex-col items-center justify-center p-8 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition cursor-pointer"
          >
            <span className="text-3xl mb-2">👀</span>
            <h3 className="text-2xl font-bold text-blue-700">みんなの写真を見る</h3>
            <p className="text-blue-600 mt-2">投稿された作品を閲覧して投票しよう</p>
          </Link>

          {/* 投稿へ */}
          <Link 
            href={`/contests/${contest.contestId}/submit`}
            className="flex flex-col items-center justify-center p-8 bg-orange-50 border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition cursor-pointer"
          >
            <span className="text-3xl mb-2">📸</span>
            <h3 className="text-2xl font-bold text-orange-700">写真を投稿する</h3>
            <p className="text-orange-600 mt-2">あなたの自慢の1枚で参加しよう</p>
          </Link>
        </div>
      ) : (
        <div className="mt-6 p-4 text-center bg-gray-100 rounded-lg text-gray-500">
          このコンテストは現在 <span className="font-semibold">{contest.status}</span> のため、投稿・投票はできません。
        </div>
      )}

      {/* ここに後で「モデル写真（ContestModelPhotoController）」の表示エリアを追加すると良いでしょう */}
    </main>
  );
}