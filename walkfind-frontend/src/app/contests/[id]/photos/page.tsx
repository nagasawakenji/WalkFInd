'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// 型定義
type SimilarityStatus = 'READY' | 'NOT_READY';

interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  userId: string;
  totalVotes: number;
  photoUrl: string;
  submissionDate: string;

  // backend側の実装揺れに備えて両方受ける（どちらかが入る想定）
  similarityStatus?: SimilarityStatus | null;
  status?: SimilarityStatus | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PhotoListResponse {
  photoResponses: PhotoDisplayResponse[];
  totalCount: number;
}

// 写真削除APIのレスポンス型
type DeletePhotoStatus =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'FAILED'
  | 'INTERNAL_SERVER_ERROR';

interface DeletingPhotoResponse {
  photoId: number | null;
  status: DeletePhotoStatus;
  message?: string;
}

interface UserMeResponse {
  userId: string;
}

type ApiErrorResponse = {
  message?: string;
};

// 環境変数
const IS_LOCAL = process.env.NODE_ENV !== 'production';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_LOCAL
    ? 'http://localhost:8080/api/v1'
    : 'https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1');

const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function extractApiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data as unknown;
  if (!data || typeof data !== 'object') return null;
  if ('message' in data && typeof (data as ApiErrorResponse).message === 'string') {
    return (data as ApiErrorResponse).message ?? null;
  }
  return null;
}

export default function PhotoListPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;
  const router = useRouter(); // router追加
  
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(18);

  const redirectToLogin = () => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    window.localStorage.setItem('redirect_after_login', currentPath);

    if (COGNITO_LOGIN_URL) {
      window.location.href = COGNITO_LOGIN_URL;
    } else {
      window.location.href = '/login';
    }
  };

  // 初回ロード時に写真リストを取得
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const res = await api.get<PhotoListResponse>(`/contests/${contestId}/photos`, {
          params: { page, size },
        });
        setPhotos(res.data.photoResponses);
        setTotalCount(res.data.totalCount);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [contestId, page, size]);

  // ログイン中なら /users/me から userId を取得
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<UserMeResponse>('/users/me');
        setCurrentUserId(res.data.userId);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setCurrentUserId(null);
        }
      }
    };
    fetchMe();
  }, []);

  // 投票ボタンクリック時の処理
  const handleVote = async (photoId: number) => {
    if (votingId !== null) return;
    setVotingId(photoId);

    try {
      await api.post('/votes', {
        contestId: Number(contestId),
        photoId,
      });

      setPhotos((prev) =>
        prev.map((p) =>
          p.photoId === photoId ? { ...p, totalVotes: p.totalVotes + 1 } : p
        )
      );
      
      alert('投票しました！');

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        redirectToLogin();
        return;
      }
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert('このコンテストには既に投票済みです（1人1票まで）。');
      } else {
        alert('投票に失敗しました。');
      }
    } finally {
      setVotingId(null);
    }
  };

  // 写真削除ボタンクリック時の処理
  const handleDelete = async (photoId: number) => {
    if (deletingId !== null) return;
    const confirmed = window.confirm('この写真を削除しますか？\n一度削除すると元に戻せません。');
    if (!confirmed) return;

    setDeletingId(photoId);

    try {
      const res = await api.delete<DeletingPhotoResponse>(`/photos/${photoId}`);
      if (res.data.status === 'SUCCESS') {
        setPhotos((prev) => prev.filter((p) => p.photoId !== photoId));
        setTotalCount((prev) => Math.max(prev - 1, 0));
        alert('写真を削除しました。');
      } else {
        alert(res.data.message || '写真の削除に失敗しました。');
      }
    } catch (error) {
       if (axios.isAxiosError(error) && error.response?.status === 401) {
          redirectToLogin();
          return;
       }
       const msg = extractApiErrorMessage(error) ?? 'エラーが発生しました。';
       alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / size);

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* 共通ナビゲーションバー（他ページと統一） */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 h-14 flex items-center px-4 lg:px-8 shadow-sm">
        <Link href="/" className="font-bold text-xl tracking-tighter text-black hover:text-gray-600 transition-colors">
          WalkFind
        </Link>
        <span className="mx-3 text-gray-300">/</span>
        <Link href={`/contests/${contestId}`} className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
          Contest Details
        </Link>
        <span className="mx-3 text-gray-300">/</span>
        <span className="text-sm font-medium text-black">Photos</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 mt-8 lg:mt-12">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mb-2">
               Contest Photos
            </h1>
            <p className="text-gray-500 text-sm md:text-base">
                気に入った写真に投票しよう（1人1票）
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
             <div className="text-sm font-mono text-gray-500 bg-white px-3 py-1 border border-gray-200 rounded-full shadow-sm">
                Total: <span className="font-bold text-black">{totalCount}</span>
             </div>
             {/* 投稿ボタンへの誘導 */}
             <Link 
                href={`/contests/${contestId}/submit`}
                className="hidden md:inline-flex items-center gap-1 px-5 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition shadow-md"
             >
                <span>+</span> Submit Photo
             </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-40">
            <div className="flex flex-col items-center gap-3">
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                 <p className="text-gray-400 text-sm font-mono">Loading photos...</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="py-24 text-center bg-white border border-dashed border-gray-300 rounded-xl">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-lg text-gray-800 font-bold mb-2">No Photos Yet</p>
            <p className="text-gray-500 mb-6">まだ写真が投稿されていません。</p>
            <Link 
               href={`/contests/${contestId}/submit`}
               className="inline-block px-8 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition shadow-lg"
            >
              一番乗りで投稿する
            </Link>
          </div>
        ) : (
          <>
            {/* 写真グリッド */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {photos.map((photo) => (
                <div key={photo.photoId} className="group flex flex-col">
                  {/* 写真エリア */}
                  <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-xl overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                    {photo.photoUrl ? (
                      <Image
                        src={photo.photoUrl}
                        alt={photo.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-200">No Image</div>
                    )}
                    
                    {/* IDバッジ（ホバー時のみ表示など、控えめに） */}
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-mono backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                       #{photo.photoId}
                    </div>

                    {/* ホバー時のオーバーレイ（PC） */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                  </div>

                  {/* 情報エリア */}
                  <div className="mt-4 px-1 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-black">
                            {photo.title}
                        </h3>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                            by
                            <Link
                                href={`/users/${photo.userId}`}
                                className="font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                {photo.username}
                            </Link>
                        </div>
                    </div>

                    {/* アクションエリア */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      {/* 投票数とボタン */}
                      <div className="flex items-center gap-3">
                         <div className="flex flex-col items-center min-w-[30px]">
                            <span className="text-xs text-gray-400 font-bold uppercase">Votes</span>
                            <span className="text-lg font-mono font-bold text-black">{photo.totalVotes}</span>
                         </div>
                         <button
                            onClick={() => handleVote(photo.photoId)}
                            disabled={votingId !== null}
                            className={`
                                h-9 px-4 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1
                                ${votingId === photo.photoId 
                                    ? 'bg-gray-100 text-gray-400 cursor-wait' 
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-black hover:text-black hover:bg-black hover:text-white'
                                }
                            `}
                          >
                            {votingId === photo.photoId ? 'Sending...' : (
                                <>
                                  <span className="text-sm">♡</span> Vote
                                </>
                            )}
                          </button>
                      </div>

                      {/* 所有者用メニュー（削除 / Similarity） */}
                      {currentUserId && currentUserId === photo.userId && (
                        <div className="flex items-center gap-2">
                           {/* Similarityボタン */}
                            {(() => {
                              const s = (photo.similarityStatus ?? photo.status) as SimilarityStatus | null | undefined;
                              if (s !== 'READY') return null;
                              return (
                                <Link
                                  href={`/contests/${contestId}/photos/${photo.photoId}`} 
                                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Check Similarity"
                                >
                                  <span className="text-lg">🧭</span>
                                </Link>
                              );
                            })()}

                            {/* 削除ボタン */}
                            <button
                              type="button"
                              onClick={() => handleDelete(photo.photoId)}
                              disabled={deletingId === photo.photoId}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30"
                              title="Delete Photo"
                            >
                               {deletingId === photo.photoId ? (
                                   <span className="text-xs">...</span>
                               ) : (
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               )}
                            </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーション（モダン円形スタイル） */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-16">
                {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`
                            w-10 h-10 flex items-center justify-center rounded-full text-sm font-mono transition-all duration-200
                            ${i === page 
                            ? "bg-black text-white shadow-md scale-110" 
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }
                        `}
                    >
                    {i + 1}
                    </button>
                ))}
                </div>
            )}
          </>
        )}
      </div>

      {/* モバイル用固定投稿ボタン（任意） */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <Link 
            href={`/contests/${contestId}/submit`}
            className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-xl hover:scale-105 transition-transform"
        >
            <span className="text-2xl font-light">+</span>
        </Link>
      </div>
    </main>
  );
}