'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';

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

// 写真削除APIのレスポンス型（バックエンドのDelete用DTOに対応）
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

// /users/me は多くのフィールドを返しますが、このページでは userId だけ使う
interface UserMeResponse {
  userId: string;
}

// APIエラー形（message が返る場合に備える）
type ApiErrorResponse = {
  message?: string;
};

// 環境変数（未設定時のフォールバック込み）
const IS_LOCAL = process.env.NODE_ENV !== 'production';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_LOCAL
    ? 'http://localhost:8080/api/v1'
    : 'https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1');

const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;

// HttpOnly Cookie を送るため withCredentials を常に true
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
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(18); // 3の倍数にしてグリッドの並びを綺麗にするため調整

  const redirectToLogin = () => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    // トークンは保存しないが、ログイン後の復帰先は保存してOK
    window.localStorage.setItem('redirect_after_login', currentPath);

    if (COGNITO_LOGIN_URL) {
      window.location.href = COGNITO_LOGIN_URL;
    } else {
      window.location.href = '/login';
    }
  };

  console.log('[PhotoListPage] render', {
    contestId,
    page,
    size,
    photosCount: photos.length,
    totalCount,
    isLoading,
    votingId,
    deletingId,
    currentUserId,
  });

  // 初回ロード時に写真リストを取得
  useEffect(() => {
    const fetchPhotos = async () => {
      console.log('[fetchPhotos] start', { contestId, page, size });
      try {
        setIsLoading(true);
        const res = await api.get<PhotoListResponse>(`/contests/${contestId}/photos`, {
          params: { page, size },
        });

        console.log('[fetchPhotos] success', {
          status: res.status,
          data: res.data,
        });

        setPhotos(res.data.photoResponses);
        setTotalCount(res.data.totalCount);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('[fetchPhotos] axios error', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
        } else {
          console.error('[fetchPhotos] unknown error', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [contestId, page, size]);

  // ログイン中なら /users/me から userId を取得（未ログインなら 401 なので無視）
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get<UserMeResponse>('/users/me');
        setCurrentUserId(res.data.userId);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // 未ログイン
          setCurrentUserId(null);
          return;
        }
        console.error('[fetchMe] error', err);
      }
    };

    fetchMe();
  }, []);

  // 投票ボタンクリック時の処理
  const handleVote = async (photoId: number) => {
    console.log('[handleVote] called', { photoId, votingId });
    if (votingId !== null) return;
    setVotingId(photoId);

    try {
      await api.post(
        '/votes',
        {
          contestId: Number(contestId),
          photoId,
        }
      );

      console.log('[handleVote] success');

      setPhotos((prev) =>
        prev.map((p) =>
          p.photoId === photoId ? { ...p, totalVotes: p.totalVotes + 1 } : p
        )
      );
      
      alert('投票しました！');

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[handleVote] axios error', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }
      } else {
        console.error('[handleVote] unknown error', error);
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

  // 写真削除ボタンクリック時の処理（自分の写真のみ）
  const handleDelete = async (photoId: number) => {
    console.log('[handleDelete] called', { photoId, deletingId });
    if (deletingId !== null) return;

    const confirmed = window.confirm('この写真を削除しますか？\n一度削除すると元に戻せません。');
    if (!confirmed) return;

    setDeletingId(photoId);

    try {
      const res = await api.delete<DeletingPhotoResponse>(`/photos/${photoId}`);

      console.log('[handleDelete] response', {
        status: res.status,
        data: res.data,
      });

      const data = res.data;
      if (data.status === 'SUCCESS') {
        // 一覧から削除された写真を取り除く
        setPhotos((prev) => prev.filter((p) => p.photoId !== photoId));
        setTotalCount((prev) => Math.max(prev - 1, 0));
        alert(data.message || '写真を削除しました。');
      } else {
        alert(data.message || '写真の削除に失敗しました。');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[handleDelete] axios error', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        if (error.response?.status === 401) {
          redirectToLogin();
          return;
        }
      } else {
        console.error('[handleDelete] unknown error', error);
      }
      const msg = extractApiErrorMessage(error) ?? '写真の削除中にエラーが発生しました。';
      alert(msg);
    } finally {
      setDeletingId(null);
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

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVote(photo.photoId)}
                          disabled={votingId !== null}
                          className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-5 py-2 rounded-sm text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:bg-gray-100"
                        >
                          {votingId === photo.photoId ? 'Sending...' : 'Vote'}
                        </button>

                        {currentUserId && currentUserId === photo.userId && (
                          <>
                            {(() => {
                              const s = (photo.similarityStatus ?? photo.status) as SimilarityStatus | null | undefined;
                              if (s !== 'READY') return null; // NOT_READY / null はボタン非表示
                              return (
                                <Link
                                  href={`/contests/${contestId}/photos/${photo.photoId}`}
                                  className="bg-white border border-green-600 text-green-700 hover:bg-green-600 hover:text-white px-4 py-2 rounded-sm text-xs font-bold transition-colors"
                                >
                                  Similarity
                                </Link>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={() => handleDelete(photo.photoId)}
                              disabled={deletingId === photo.photoId}
                              className="bg-white border border-red-500 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-sm text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:bg-gray-100"
                            >
                              {deletingId === photo.photoId ? 'Deleting...' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
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