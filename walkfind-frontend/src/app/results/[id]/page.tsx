'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import axios, { AxiosError } from 'axios';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

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
        setResults(res.data.contestResultResponses);
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
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="flex flex-col items-center">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black mb-4"></div>
           <p className="text-gray-500 font-mono text-sm">Loading Results...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
        <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
            <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
            WalkFind
            </Link>
        </nav>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
            <div className="bg-white border border-red-200 rounded-sm p-8 shadow-sm">
                <h1 className="text-xl font-bold text-red-600 mb-4 flex items-center justify-center gap-2">
                    <span className="text-2xl">⚠️</span> Error
                </h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href="/" className="inline-block px-6 py-2 bg-gray-800 text-white text-sm font-bold rounded-sm hover:bg-black transition">
                    Top Page
                </Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white font-medium">Contest Results</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        {/* ページヘッダー */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-300 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-sm hover:bg-gray-50 transition-colors"
            >
              ← 戻る
            </button>
            <div>
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                    <span className="text-3xl">🏆</span> Contest Results
                </h1>
                <p className="text-sm text-gray-500 mt-2 font-mono">
                   Final Ranking & Award Winners
                </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {results.map((item) => {
            // 順位に応じたスタイル定義
            const rankStyle = 
                item.finalRank === 1 ? { borderColor: 'border-yellow-500', sideColor: 'bg-yellow-500', bgColor: 'bg-white' } :
                item.finalRank === 2 ? { borderColor: 'border-gray-400', sideColor: 'bg-gray-400', bgColor: 'bg-white' } :
                item.finalRank === 3 ? { borderColor: 'border-orange-500', sideColor: 'bg-orange-500', bgColor: 'bg-white' } :
                { borderColor: 'border-gray-300', sideColor: 'bg-gray-200', bgColor: 'bg-white' };

            // 1位～3位の文字色
            const rankTextColor = 
                item.finalRank === 1 ? 'text-yellow-600' :
                item.finalRank === 2 ? 'text-gray-500' :
                item.finalRank === 3 ? 'text-orange-600' : 'text-gray-400';

            return (
              <div 
                key={item.photoId} 
                className={`group relative flex flex-col md:flex-row ${rankStyle.bgColor} rounded-sm shadow-sm overflow-hidden border ${rankStyle.borderColor} transition-all duration-200 hover:shadow-md`}
              >
                {/* 左側のランク帯 */}
                <div className={`hidden md:block w-2 ${rankStyle.sideColor}`}></div>

                {/* 写真エリア */}
                <div className="relative h-64 md:h-56 md:w-1/3 bg-gray-100 border-r border-gray-200">
                  <Image
                    src={item.photoUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                  {/* モバイル用ランクバッジ (PCでは非表示) */}
                  <div className={`md:hidden absolute top-0 left-0 px-3 py-1 text-white font-bold text-sm ${rankStyle.sideColor}`}>
                    #{item.finalRank}
                  </div>
                </div>

                {/* 情報エリア */}
                <div className="p-6 md:w-2/3 flex flex-col relative">
                  {/* PC用ランク表示 */}
                  <div className={`hidden md:block absolute top-4 right-6 text-4xl font-bold font-mono opacity-20 ${rankTextColor}`}>
                    #{item.finalRank}
                  </div>

                  <div className="mb-1">
                     <span className={`text-xs font-bold uppercase tracking-wider ${rankTextColor}`}>
                        Rank {item.finalRank}
                     </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h2>
                  
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <span className="text-xs text-gray-400">Photographer:</span>
                    <Link
                      href={`/users/${item.userId}`}
                      className="font-medium hover:underline hover:text-black"
                    >
                      {item.username}
                    </Link>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-bold">Score</div>
                        <div className="text-2xl font-bold text-black font-mono">
                            {item.finalScore} <span className="text-sm text-gray-400 font-normal">pts</span>
                        </div>
                    </div>
                    {item.finalRank === 1 && (
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-sm border border-yellow-200">
                            WINNER 🏆
                        </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {results.length === 0 && (
          <div className="bg-white border border-gray-300 rounded-sm p-12 text-center text-gray-500">
            <p className="text-lg">投稿がありませんでした。</p>
            <p className="text-sm mt-2">No submissions found.</p>
          </div>
        )}

        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="inline-block px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-sm hover:bg-gray-50 transition-colors">
            &larr; Back to Top
          </Link>
        </div>
      </div>
    </main>
  );
}