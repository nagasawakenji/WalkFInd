'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import axios, { AxiosError } from 'axios'; // ★修正: AxiosError をインポート
import { fetchAuthSession } from 'aws-amplify/auth';

// 型定義 (src/types/index.ts にあるものと同じ想定)
interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  userId: string; // ★追加: プロフィール遷移用
  totalVotes: number;
  photoUrl: string; // ★修正: バックエンドが返す実URLを使用
  submissionDate: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function PhotoListPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null); // 投票中の写真ID

  const [page, setPage] = useState(0);
  const [size] = useState(20);

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
    if (votingId !== null) return; // 連打防止
    setVotingId(photoId);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        const loginUrl = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
        if (loginUrl) {
          // ログイン後に元のページへ戻すためURLを保存
          const currentPath = window.location.pathname + window.location.search;
          localStorage.setItem("redirect_after_login", currentPath);

          window.location.href = loginUrl;
        }
        return;
      }

      // 2. 投票APIコール
      await axios.post(`${API_BASE_URL}/votes`, 
        { 
          contestId: Number(contestId), 
          photoId: photoId 
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // 3. 成功したら見た目の票数を+1する (楽観的UI更新)
      setPhotos((prev) =>
        prev.map((p) =>
          p.photoId === photoId ? { ...p, totalVotes: p.totalVotes + 1 } : p
        )
      );
      
      alert('投票しました！');

    } catch (error) {
      // ★修正: any を使わず、AxiosErrorかどうかをチェックする
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

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">写真を読み込み中...</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">投稿写真一覧</h1>
        <div className="text-sm text-gray-500">
          全 {totalCount} 件（{page * size + 1} - {Math.min((page + 1) * size, totalCount)}）
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-500 mb-4">まだ写真が投稿されていません。</p>
          <p>一番乗りで投稿してみませんか？</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div key={photo.photoId} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                {/* 写真エリア */}
                <div className="relative h-64 w-full bg-gray-100">
                  {photo.photoUrl && (
                    <Image
                      src={photo.photoUrl}
                      alt={photo.title}
                      fill
                      className="object-cover"
                      // S3やローカル画像のドメインを next.config.js に追加する必要がある点に注意
                      unoptimized={true} // 一旦最適化をオフにして表示エラーを防ぐ
                    />
                  )}
                </div>

                {/* 情報エリア */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{photo.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    by{' '}
                    <Link
                      href={`/users/${photo.userId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {photo.username}
                    </Link>
                  </p>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center text-yellow-500 font-bold">
                      <span className="text-xl mr-1">★</span>
                      <span>{photo.totalVotes}</span>
                    </div>

                    <button
                      onClick={() => handleVote(photo.photoId)}
                      disabled={votingId !== null}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      投票する
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              前へ
            </button>

            <span className="text-sm text-gray-700">
              {page + 1} / {Math.ceil(totalCount / size)}
            </span>

            <button
              onClick={() => setPage((p) => (p + 1 < Math.ceil(totalCount / size) ? p + 1 : p))}
              disabled={page + 1 >= Math.ceil(totalCount / size)}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </>
      )}
    </main>
  );
}