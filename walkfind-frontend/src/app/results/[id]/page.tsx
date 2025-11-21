'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import axios, { AxiosError } from 'axios'; // AxiosError をインポート
import Link from 'next/link';

// 型定義
interface ContestResultResponse {
  rank: number;
  photoId: number;
  title: string;
  username: string;
  totalVotes: number;
  photoUrl: string; // 署名付きURL
}

interface PageProps {
  params: { id: string };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function ResultPage({ params }: PageProps) {
  const contestId = params.id;
  const [results, setResults] = useState<ContestResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/results/${contestId}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
        
        // ★修正: axios.isAxiosError で型ガードを行う
        if (axios.isAxiosError(err) && err.response) {
          // Controllerが返すステータスに応じたメッセージ
          if (err.response.status === 403) {
            setError('集計中、または結果発表前です。');
          } else if (err.response.status === 404) {
            setError('コンテストが見つかりません。');
          } else {
            setError('結果の取得に失敗しました。');
          }
        } else {
          // Axios以外のエラー（ネットワークエラーなど）
          setError('予期せぬエラーが発生しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [contestId]);

  if (loading) return <div className="text-center py-20">集計結果を読み込み中...</div>;
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">{error}</h1>
        <Link href="/" className="text-blue-600 hover:underline">トップへ戻る</Link>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">🏆 結果発表 🏆</h1>
      <p className="text-center text-gray-500 mb-10">栄えある入賞作品はこちら！</p>

      <div className="space-y-8">
        {results.map((item) => (
          <div 
            key={item.photoId} 
            className={`relative flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden border-2 
              ${item.rank === 1 ? 'border-yellow-400 order-first transform md:scale-105 z-10' : 
                item.rank === 2 ? 'border-gray-300' : 
                item.rank === 3 ? 'border-orange-300' : 'border-transparent'
              }`}
          >
            {/* 順位バッジ */}
            <div className={`absolute top-0 left-0 px-4 py-2 rounded-br-xl font-bold text-white z-20
               ${item.rank === 1 ? 'bg-yellow-500 text-xl' : 
                 item.rank === 2 ? 'bg-gray-400 text-lg' : 
                 item.rank === 3 ? 'bg-orange-400 text-lg' : 'bg-blue-500'
               }`}
            >
              {item.rank}位
            </div>

            {/* 写真エリア */}
            <div className="relative h-64 md:h-auto md:w-1/2 bg-gray-100">
              <Image
                src={item.photoUrl}
                alt={item.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* 情報エリア */}
            <div className="p-6 md:w-1/2 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
              <p className="text-gray-600 mb-4">撮影者: {item.username}</p>
              
              <div className="mt-auto">
                <div className="text-sm text-gray-500">獲得票数</div>
                <div className="text-3xl font-bold text-blue-600">{item.totalVotes} 票</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <p className="text-center text-gray-500">投稿がありませんでした。</p>
      )}

      <div className="text-center mt-12">
        <Link href="/" className="bg-gray-600 text-white px-6 py-3 rounded-full hover:bg-gray-700 transition">
          トップページへ戻る
        </Link>
      </div>
    </main>
  );
}