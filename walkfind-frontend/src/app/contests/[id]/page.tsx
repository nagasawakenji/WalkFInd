// src/app/contests/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContestDetailResponse } from '@/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// データ取得関数は変更なし
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
    notFound(); 
  }

  // ステータスに応じたバッジの色分け
  const isProgress = contest.status === "IN_PROGRESS";
  const statusColor = isProgress 
    ? "bg-green-600 text-white" 
    : "bg-gray-500 text-white";

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
       {/* 共通ナビゲーションバー（一貫性のため配置） */}
       <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-gray-300">{contest.name}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        {/* ヘッダー部分：コンテスト概要パネル */}
        <div className="bg-white rounded-sm border border-gray-300 p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-gray-200 pb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-3">
              {contest.name}
            </h1>
            <span className={`mt-2 md:mt-0 px-3 py-1 text-sm font-bold rounded-sm ${statusColor}`}>
              {contest.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold mb-2 text-gray-700">テーマ: {contest.theme}</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-sm border border-gray-200">
                {contest.description}
              </div>
            </div>

            {/* 日付情報のサイドパネル化 */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 h-fit">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-100 pb-1">
                Contest Period
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Start</p>
                  <p className="font-mono font-medium">{new Date(contest.startDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">End</p>
                  <p className="font-mono font-medium">{new Date(contest.endDate).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタンエリア */}
        {isProgress ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 投票・閲覧へ */}
            <Link 
              href={`/contests/${contest.contestId}/photos`}
              className="group block bg-white border border-gray-300 rounded-sm p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center gap-4">
                <span className="text-3xl group-hover:scale-110 transition-transform">👀</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">
                    みんなの写真を見る
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    投稿一覧・投票ページへ移動します
                  </p>
                </div>
              </div>
            </Link>

            {/* 投稿へ */}
            <Link 
              href={`/contests/${contest.contestId}/submit`}
              className="group block bg-white border border-gray-300 rounded-sm p-6 hover:border-orange-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="flex items-center gap-4">
                <span className="text-3xl group-hover:scale-110 transition-transform">📸</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600">
                    写真を投稿する
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    あなたの作品をアップロードします
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="mt-6 p-4 border border-gray-300 bg-gray-100 rounded-sm text-center text-gray-600 text-sm">
            <span className="block font-bold mb-1">Entry Closed</span>
            このコンテストは現在 <span className="font-mono bg-gray-200 px-1 rounded">{contest.status}</span> のため、投稿・投票などの操作は行えません。
          </div>
        )}

        {/* ここに後で「モデル写真（ContestModelPhotoController）」の表示エリアを追加すると良いでしょう */}
      </div>
    </main>
  );
}