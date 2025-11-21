'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import axios, { AxiosError } from 'axios'; // ★修正: AxiosError をインポート
import { fetchAuthSession } from 'aws-amplify/auth';

// 型定義 (src/types/index.ts にあるものと同じ想定)
interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  totalVotes: number;
  presignedUrl: string; // 画像URL
  submissionDate: string;
}

interface PageProps {
  params: { id: string };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function PhotoListPage({ params }: PageProps) {
  const contestId = params.id;
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null); // 投票中の写真ID

  // 初回ロード時に写真リストを取得
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // このエンドポイントは認証不要(public)
        const res = await axios.get(`${API_BASE_URL}/contests/${contestId}/photos`);
        setPhotos(res.data);
      } catch (error) {
        console.error('Failed to fetch photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [contestId]);

  // 投票ボタンクリック時の処理
  const handleVote = async (photoId: number) => {
    if (votingId !== null) return; // 連打防止
    setVotingId(photoId);

    try {
      // 1. 認証トークン取得
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        alert('投票するにはログインが必要です。');
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
        <div className="text-sm text-gray-500">全 {photos.length} 件</div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-500 mb-4">まだ写真が投稿されていません。</p>
          <p>一番乗りで投稿してみませんか？</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div key={photo.photoId} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
              {/* 写真エリア */}
              <div className="relative h-64 w-full bg-gray-100">
                <Image
                  src={photo.presignedUrl}
                  alt={photo.title}
                  fill
                  className="object-cover"
                  // S3やローカル画像のドメインを next.config.js に追加する必要がある点に注意
                  unoptimized={true} // 一旦最適化をオフにして表示エラーを防ぐ
                />
              </div>

              {/* 情報エリア */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{photo.title}</h3>
                <p className="text-xs text-gray-500 mb-3">by {photo.username}</p>
                
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
      )}
    </main>
  );
}