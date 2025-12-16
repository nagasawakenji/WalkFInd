'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  userId: string;
  totalVotes: number;
  photoUrl: string;
  submissionDate: string;
}

interface PhotoListResponse {
  photoResponses: PhotoDisplayResponse[];
  totalCount: number;
}

type AdminDeletePhotoStatus =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'ALREADY_REMOVED'
  | 'CONTEST_MISMATCH'
  | 'FAILED'
  | 'INTERNAL_SERVER_ERROR';

interface AdminDeletingPhotoResponse {
  contestId: number | null;
  photoId: number | null;
  status: AdminDeletePhotoStatus;
  message?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminContestPhotosPage({ params }: PageProps) {
  const router = useRouter();

  const resolvedParams = use(params);
  const contestId = resolvedParams.id;

  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(0);
  const [size] = useState(18);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      setError(null);

      try {
        // 既存の「コンテストの写真一覧」APIを流用
        const res = await api.get<PhotoListResponse>(`/contests/${contestId}/photos`, {
          params: { page, size },
        });

        setPhotos(res.data.photoResponses);
        setTotalCount(res.data.totalCount);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const httpStatus = err.response?.status;

          if (httpStatus === 401) {
            localStorage.setItem('redirect_after_login', `/admin/modify/${contestId}/photos`);
            router.replace('/login');
            return;
          }
          if (httpStatus === 403) {
            setError('管理者権限がありません');
            return;
          }
        }
        console.error('Failed to fetch photos', err);
        setError('写真一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [router, contestId, page, size]);

  const handleAdminDelete = async (photoId: number) => {
    if (deletingId !== null) return;

    const ok = window.confirm(
      `この写真を削除（論理削除）しますか？\nphotoId=${photoId}\n削除後は通常の一覧から非表示になります。`
    );
    if (!ok) return;

    setDeletingId(photoId);

    try {
      const res = await api.delete<AdminDeletingPhotoResponse>(
        `/admin/contests/${contestId}/photos/${photoId}`
      );

      const data = res.data;

      if (data.status === 'SUCCESS') {
        // 一覧から即反映（再取得でもOK）
        setPhotos((prev) => prev.filter((p) => p.photoId !== photoId));
        setTotalCount((prev) => Math.max(prev - 1, 0));
        alert(data.message ?? '写真を削除しました');
      } else {
        alert(data.message ?? '写真の削除に失敗しました');
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const httpStatus = err.response?.status;

        if (httpStatus === 401) {
          localStorage.setItem('redirect_after_login', `/admin/modify/${contestId}/photos`);
          router.replace('/login');
          return;
        }
        if (httpStatus === 403) {
          alert('管理者権限がありません');
          return;
        }
      }

      console.error('Failed to admin delete photo', err);
      alert('写真の削除中にエラーが発生しました');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/admin/modify" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind Admin
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white">Contest {contestId} Photos</span>

        <div className="ml-auto text-xs space-x-4">
          <Link href="/admin/modify" className="hover:underline">
            コンテスト一覧へ
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-black flex items-center gap-2">
            <span className="text-3xl">🧹</span> 管理者：投稿写真の削除
          </h1>

          <div className="text-sm text-gray-600 font-mono mt-2 md:mt-0 bg-white px-3 py-1 border border-gray-300 rounded-sm">
            Total: <span className="font-bold text-black">{totalCount}</span> / Page {page + 1} /{' '}
            {totalPages}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900" />
          </div>
        )}

        {!loading && error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        {!loading && !error && photos.length === 0 && (
          <div className="text-center py-24 bg-white border border-gray-300 rounded-sm">
            <p className="text-xl text-gray-800 font-bold mb-2">No Photos</p>
            <p className="text-gray-500">このコンテストには写真がありません。</p>
          </div>
        )}

        {!loading && !error && photos.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {photos.map((photo) => (
                <div
                  key={photo.photoId}
                  className="group bg-white rounded-sm border border-gray-300 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden border-b border-gray-200">
                    {photo.photoUrl ? (
                      <Image
                        src={photo.photoUrl}
                        alt={photo.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No Image
                      </div>
                    )}

                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-sm text-xs font-mono backdrop-blur-sm">
                      ID: {photo.photoId}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex-grow">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-1">
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
                        type="button"
                        onClick={() => handleAdminDelete(photo.photoId)}
                        disabled={deletingId === photo.photoId}
                        className="bg-white border border-red-500 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-sm text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:bg-gray-100"
                      >
                        {deletingId === photo.photoId ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center items-center gap-2 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                &laquo; Prev
              </button>

              <div className="px-4 py-2 bg-white border border-gray-300 text-sm font-mono rounded-sm text-black">
                {page + 1} / {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages}
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