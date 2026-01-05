'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 型定義
interface ContestResultResponse {
  photoId: number;
  contestId: number;
  finalRank: number;
  finalScore: number;
  isWinner: boolean;
  title: string;
  photoUrl: string;
  userId: string;
  username: string;
  submissionDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ResultPage({ params }: PageProps) {
  const { id: contestId } = use(params);
  const router = useRouter();
  const [results, setResults] = useState<ContestResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/results/${contestId}`);
        setResults(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch (err) {
        console.error(err);
        
        if (axios.isAxiosError(err) && err.response) {
          if (err.response.status === 403) {
            setError('集計中、または結果発表前です。');
          } else if (err.response.status === 404) {
            setError('コンテストが見つかりません。');
          } else {
            setError('結果の取得に失敗しました。');
          }
        } else {
          setError('予期せぬエラーが発生しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [contestId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
           <p className="text-gray-400 font-mono text-sm">Loading Results...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center px-4 lg:px-8">
            <Link href="/" className="font-bold text-xl tracking-tight text-black">
               WalkFind
            </Link>
        </nav>
        <div className="pt-32 max-w-2xl mx-auto px-4 text-center">
            <div className="bg-white border border-red-100 rounded-xl p-10 shadow-sm">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
                <p className="text-gray-500 mb-8">{error}</p>
                <Link href="/" className="inline-block px-6 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition">
                    Top Page
                </Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* 共通ナビゲーションバー (Fixed & H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Results</span>
            </div>
        </div>
      </nav>

      {/* コンテンツエリア (pt-24) */}
      <div className="pt-24 max-w-7xl mx-auto px-4">
        
        {/* ページヘッダー */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-200 pb-6">
          <div>
              <div className="inline-block py-1 px-3 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold tracking-wider mb-3 uppercase border border-yellow-100">
                Official Results
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mb-2">
                 Contest Rankings
              </h1>
              <p className="text-gray-500 text-sm md:text-base">
                 最終結果と優勝作品の発表です。
              </p>
          </div>
          
          <button
            onClick={() => router.back()}
            className="mt-4 md:mt-0 px-5 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-full hover:bg-gray-50 hover:text-black hover:border-gray-300 transition-colors shadow-sm"
          >
            ← Back
          </button>
        </div>

        {/* 結果グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {results.map((item) => {
            const isWinner = item.finalRank === 1;
            
            return (
              <div 
                key={item.photoId} 
                className={`
                    group flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1
                    ${isWinner 
                        ? 'shadow-xl ring-2 ring-yellow-400/50' 
                        : 'shadow-sm hover:shadow-xl border border-gray-200'
                    }
                `}
              >
                {/* 写真エリア */}
                <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                  <Image
                    src={item.photoUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized
                  />
                  
                  {/* ランクバッジ (画像上に配置) */}
                  <div className={`
                      absolute top-3 left-3 px-3 py-1 text-sm font-bold font-mono rounded-lg shadow-lg border border-white/10 backdrop-blur-md
                      ${isWinner 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' 
                          : 'bg-black/80 text-white'
                      }
                  `}>
                     {isWinner && <span className="mr-1">🏆</span>}
                     #{item.finalRank}
                  </div>

                  {/* Similarityボタン (ホバー時に出現させるとお洒落だが、今回は常時表示or見やすさ重視で配置) */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <Link
                        href={`/contests/${contestId}/photos/${item.photoId}`} // 元のパス構成に合わせています
                        className="flex items-center gap-1 bg-white/90 hover:bg-white text-black text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
                     >
                        <span>🧭</span> Analysis
                     </Link>
                  </div>
                  
                  {/* 黒オーバーレイ (ホバー時) */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                </div>

                {/* 情報エリア */}
                <div className={`p-5 flex flex-col flex-grow ${isWinner ? 'bg-gradient-to-b from-yellow-50/30 to-white' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-black">
                        {item.title}
                      </h2>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                         <span className="text-xl font-mono font-bold text-black leading-none">{item.finalScore}</span>
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Points</span>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                    <span className="text-xs text-gray-400">by</span>
                    <Link
                      href={`/users/${item.userId}`}
                      className="font-medium text-gray-600 hover:text-black hover:underline transition-colors"
                    >
                      {item.username}
                    </Link>
                  </div>
                  
                  {/* フッター (モバイルなどでボタンを押しやすくするための補助配置) */}
                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between md:hidden">
                        <span className="text-xs font-bold text-gray-400">Actions</span>
                        <Link
                            href={`/contests/${contestId}/photos/${item.photoId}`}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                            View Similarity &rarr;
                        </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {results.length === 0 && (
          <div className="py-24 text-center bg-white border border-dashed border-gray-300 rounded-xl">
             <div className="text-4xl mb-4 text-gray-300">📂</div>
            <p className="text-lg font-bold text-gray-700">No Results Found</p>
            <p className="text-sm text-gray-500 mt-1">集計データがありません。</p>
          </div>
        )}

        <div className="text-center mt-16 pt-8 border-t border-gray-200">
          <Link href="/" className="inline-block px-8 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-full hover:bg-black hover:text-white hover:border-black transition-all shadow-sm">
            Top Page
          </Link>
        </div>
      </div>
    </main>
  );
}