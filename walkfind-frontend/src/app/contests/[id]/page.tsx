// src/app/contests/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContestDetailResponse } from '@/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// 環境変数
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function getContestDetail(id: string): Promise<ContestDetailResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/contests/${id}`,
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

  const isProgress = contest.status === "IN_PROGRESS";
  
  // 日付フォーマット用関数
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', { 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800">
       {/* 共通ナビゲーションバー */}
       <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 h-14 flex items-center px-4 lg:px-8 shadow-sm">
        <Link href="/" className="font-bold text-xl tracking-tighter text-black hover:text-gray-600 transition-colors">
          WalkFind
        </Link>
        <span className="mx-3 text-gray-300">/</span>
        <span className="text-sm font-medium text-black truncate">{contest.name}</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 lg:py-16">
        
        {/* ---------------- ヒーローセクション（タイトル・概要） ---------------- */}
        <div className="text-center mb-12">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-6 border ${
                isProgress 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${isProgress ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                {isProgress ? "NOW OPEN" : contest.status}
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight mb-4">
              {contest.name}
            </h1>
            
            <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
              Theme: <span className="text-black font-semibold">{contest.theme}</span>
            </p>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm text-left max-w-2xl mx-auto">
                 <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">About this contest</h2>
                 <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {contest.description}
                 </p>
                 
                 <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-mono text-gray-500">
                    <div>
                        <span className="block text-xs text-gray-400 mb-1">START DATE</span>
                        {formatDate(contest.startDate)}
                    </div>
                    <div className="hidden sm:block text-gray-300">→</div>
                    <div className="text-right sm:text-left">
                        <span className="block text-xs text-gray-400 mb-1">END DATE</span>
                        {formatDate(contest.endDate)}
                    </div>
                 </div>
            </div>
        </div>

        {/* ---------------- アクションカードエリア ---------------- */}
        {isProgress ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            
            {/* 閲覧カード: 写真メインのデザイン */}
            <Link 
              href={`/contests/${contest.contestId}/photos`}
              className="group relative h-64 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-black/20 transition-all duration-300 flex flex-col items-center justify-center text-center"
            >
              {/* 背景装飾（写真グリッド風） */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="relative z-10 p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                    <span className="text-3xl">👀</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gallery</h3>
                <p className="text-sm text-gray-500 px-4">
                    みんなの投稿を見る・投票する
                </p>
                <div className="mt-4 text-xs font-bold text-blue-600 underline decoration-2 underline-offset-4 group-hover:text-black">
                    View Photos &rarr;
                </div>
              </div>
            </Link>

            {/* 投稿カード: クリエイティブなデザイン */}
            <Link 
              href={`/contests/${contest.contestId}/submit`}
              className="group relative h-64 bg-black border border-black rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center text-center"
            >
              <div className="relative z-10 p-6 text-white">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-white group-hover:text-black transition-colors duration-300">
                    <span className="text-3xl">📸</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Submit Entry</h3>
                <p className="text-sm text-gray-300 px-4">
                    あなたの作品を応募する
                </p>
                <div className="mt-4 px-6 py-2 bg-white text-black text-xs font-bold rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    Upload Now
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto mt-8 p-8 border border-gray-200 bg-gray-100 rounded-2xl text-center">
            <div className="inline-block p-3 bg-gray-200 rounded-full text-2xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Contest Closed</h3>
            <p className="text-gray-600 text-sm">
                このコンテストの受付・投票期間は終了しました。<br/>
                結果発表をお待ちください。
            </p>
            {/* 結果画面へのリンクがあればここに表示 */}
            <div className="mt-6">
                 <Link href={`/results/${contest.contestId}`} className="text-sm font-bold text-black underline">
                    結果を見る &rarr;
                 </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}