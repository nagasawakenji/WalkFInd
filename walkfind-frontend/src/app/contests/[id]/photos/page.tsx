'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// 型定義
interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  userId: string;
  totalVotes: number;
  photoUrl: string;
  submissionDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

export default function PhotoListPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(18); // 3の倍数にしてグリッドの並びを綺麗にするため調整

  // 初回ロード時に写真リストを取得
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`${API_BASE_URL}/contests/${contestId}/photos`, {
          params: { page, size }
        });

        setPhotos(res.data.photoResponses);
        setTotalCount(res.data.totalCount);
      } catch (error) {
        console.error('Failed to fetch photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [contestId, page, size]);

  // 投票ボタンクリック時の処理
  const handleVote = async (photoId: number) => {
    if (votingId !== null) return;
    setVotingId(photoId);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        const loginUrl = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
        if (loginUrl) {
          const currentPath = window.location.pathname + window.location.search;
          localStorage.setItem("redirect_after_login", currentPath);
          window.location.href = loginUrl;
        }
        return;
      }

      await axios.post(`${API_BASE_URL}/votes`, 
        { 
          contestId: Number(contestId), 
          photoId: photoId 
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPhotos((prev) =>
        prev.map((p) =>
          p.photoId === photoId ? { ...p, totalVotes: p.totalVotes + 1 } : p
        )
      );
      
      alert('投票しました！');

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert('このコンテストには既に投票済みです（1人1票まで）。');
      } else {
        console.error('Vote failed:', error);
        alert('投票に失敗しました。');
      }
    } finally {
      setVotingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href={`/contests/${contestId}`} className="text-sm text-gray-300 hover:text-white">
          Contest Details
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white">Photos</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* ページヘッダー */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <span className="text-3xl">📸</span> 投稿写真一覧
          </h1>
          <div className="text-sm text-gray-600 font-mono mt-2 md:mt-0 bg-white px-3 py-1 border border-gray-300 rounded-sm">
            Total: <span className="font-bold text-black">{totalCount}</span> (Page {page + 1})
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-300 rounded-sm">
            <p className="text-xl text-gray-800 font-bold mb-2">No Photos Yet</p>
            <p className="text-gray-500 mb-6">まだ写真が投稿されていません。</p>
            <Link 
               href={`/contests/${contestId}/submit`}
               className="inline-block px-6 py-2 bg-black text-white text-sm font-bold rounded-sm hover:bg-gray-800 transition"
            >
              一番乗りで投稿する
            </Link>
          </div>
        ) : (
          <>
            {/* 写真グリッド：サイズを大きく見やすくするため lg:grid-cols-3 に変更 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {photos.map((photo) => (
                <div key={photo.photoId} className="group bg-white rounded-sm border border-gray-300 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
                  {/* 写真エリア：アスペクト比を固定して表示崩れを防ぐ */}
                  <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden border-b border-gray-200">
                    {photo.photoUrl ? (
                      <Image
                        src={photo.photoUrl}
                        alt={photo.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                    )}
                    
                    {/* 写真上のオーバーレイ情報（投票数など） */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-sm text-xs font-mono backdrop-blur-sm">
                       ID: {photo.photoId}
                    </div>
                  </div>

                  {/* 情報エリア */}
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {photo.title}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                        by
                        <Link
                          href={`/users/${photo.userId}`}
                          className="hover:underline hover:text-black transition-colors"
                        >
                          {photo.username}
                        </Link>
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-lg">★</span>
                        <span className="font-bold text-xl text-gray-800">{photo.totalVotes}</span>
                        <span className="text-xs text-gray-400 ml-1">votes</span>
                      </div>

                      <button
                        onClick={() => handleVote(photo.photoId)}
                        disabled={votingId !== null}
                        className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-5 py-2 rounded-sm text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:bg-gray-100"
                      >
                        {votingId === photo.photoId ? 'Sending...' : 'Vote'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーション */}
            <div className="flex justify-center items-center gap-2 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                &laquo; Prev
              </button>

              <div className="px-4 py-2 bg-white border border-gray-300 text-sm font-mono rounded-sm text-black">
                {page + 1} / {Math.ceil(totalCount / size)}
              </div>

              <button
                onClick={() => setPage((p) => (p + 1 < Math.ceil(totalCount / size) ? p + 1 : p))}
                disabled={page + 1 >= Math.ceil(totalCount / size)}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                Next &raquo;
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}