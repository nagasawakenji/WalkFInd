'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// 環境変数（文字列なので boolean 化）
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';
// 画像表示用：ブラウザが直接叩けるURLを組み立てるためのBase URL
// 例: http://localhost:8080/api/v1
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type ModelPhotoStatus =
  | 'SUCCESS'
  | 'CONTEST_NOT_FOUND'
  | 'FORBIDDEN'
  | 'MODEL_PHOTO_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

interface ContestModelPhotoItem {
  id: number;
  contestId: number;
  key: string;
  title: string;
  description: string | null;
  createdAt: string | null;
}

interface ContestModelPhotoListResponse {
  status: ModelPhotoStatus;
  photos: ContestModelPhotoItem[];
}

interface PresignedUrlResponse {
  key: string;
  photoUrl: string; // upload/downloadどちらもここにURLが入る想定
}

export default function AdminModelPhotosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contestId = useMemo(() => Number(params.id), [params.id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [photos, setPhotos] = useState<ContestModelPhotoItem[]>([]);
  const [downloadUrlMap, setDownloadUrlMap] = useState<Map<number, string>>(new Map());

  // 追加フォーム
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // 「既にアップロード済み key を手動登録」もできるようにしておく（保険）
  const [manualKey, setManualKey] = useState('');

  const handle401 = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    try {
      localStorage.setItem('redirect_after_login', currentPath);
    } catch {
      // ignore
    }
    router.replace('/login');
  };

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ContestModelPhotoListResponse>(`/contests/${contestId}/modelPhoto`);
      const data = res.data;

      if (data.status !== 'SUCCESS') {
        if (data.status === 'FORBIDDEN') setError('権限がありません（作成者のみ操作可能）');
        else if (data.status === 'CONTEST_NOT_FOUND') setError('コンテストが見つかりません');
        else setError('モデル写真の取得に失敗しました');
        setPhotos([]);
        setDownloadUrlMap(new Map());
        return;
      }

      setPhotos(data.photos ?? []);

      // 画像表示用：
      // - 本番: download presign を取得
      // - ローカル: presign が無い想定なのでスキップ（必要ならローカル配信用URLに差し替える）
      if (IS_LOCAL) {
        // ローカル: /api/v1/local-storage/{photoKey} で直接配信
        // key は LocalStorageUploadService が返したファイル名（スラッシュ無し）を想定
        const nextMap = new Map<number, string>();
        for (const p of data.photos ?? []) {
          // path variable に安全に載せる
          const encoded = encodeURIComponent(p.key);
          nextMap.set(p.id, `${API_BASE_URL}/local-storage/${encoded}`);
        }
        setDownloadUrlMap(nextMap);
        return;
      }

      const entries = await Promise.all(
        (data.photos ?? []).map(async (p) => {
          try {
            const d = await api.get<PresignedUrlResponse>('/upload/presigned-download-url', {
              params: { key: p.key },
            });
            return [p.id, d.data.photoUrl] as const;
          } catch {
            return [p.id, ''] as const;
          }
        }),
      );

      const nextMap = new Map<number, string>();
      for (const [id, url] of entries) {
        if (url) nextMap.set(id, url);
      }
      setDownloadUrlMap(nextMap);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const s = err.response?.status;
        if (s === 401) return handle401();
        if (s === 403) {
          setError('権限がありません（作成者のみ操作可能）');
          return;
        }
      }
      console.error(err);
      setError('モデル写真の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(contestId)) return;
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const uploadViaPresign = async (f: File): Promise<string> => {
    if (IS_LOCAL) {
      throw new Error('Local mode does not support presigned upload. Please use manual key or a local upload API.');
    }

    // 1) presign発行（keyはダミーでもOK。サーバ側がUUID等で安全なkeyに置換してくれる前提）
    const dummyName = f.name || 'upload.png';
    const mimeType = f.type || 'application/octet-stream';

    const presign = await api.get<PresignedUrlResponse>('/upload/presigned-url', {
      params: {
        key: `contest-model-photos/${contestId}/${dummyName}`,
        contentType: mimeType,
      },
    });

    const { photoUrl: uploadUrl, key } = presign.data;

    // 2) S3へ直接PUTアップロード（Content-Type一致必須）
    await axios.put(uploadUrl, f, {
      headers: {
        'Content-Type': mimeType,
      },
      // 念のため（S3の署名付きURLにcookie等は不要）
      withCredentials: false,
    });

    return key;
  };

  const handleCreate = async () => {
    setMessage(null);
    setError(null);

    if (!title.trim()) {
      setError('タイトルは必須です');
      return;
    }

    // 送信パターン
    // - ローカル + fileあり: multipart（file + request）で直接アップロード
    // - 本番 + fileあり: presignでS3へPUT → keyをJSONで登録
    // - fileなし: 手動keyをJSONで登録（ローカル/本番どちらでも可）

    // まずは手動key（fileなし時のパス）
    let keyToRegister = manualKey.trim();

    let res;

    if (file) {
      if (IS_LOCAL) {
        // ===================================================
        // 1) ローカル環境: multipartで直接送信
        // ===================================================
        const formData = new FormData();

        // Spring側を PhotoController と同様にする場合:
        // @RequestPart("request") DTO と @RequestPart("file") MultipartFile
        const requestPart = {
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
        };
        formData.append(
          'request',
          new Blob([JSON.stringify(requestPart)], { type: 'application/json' }),
        );
        formData.append('file', file);

        res = await api.post<ContestModelPhotoListResponse>(
          `/contests/${contestId}/modelPhoto`,
          formData,
        );
      } else {
        // ===================================================
        // 2) 本番環境: presignでS3へPUT → keyをJSONで登録
        // ===================================================
        keyToRegister = await uploadViaPresign(file);

        res = await api.post<ContestModelPhotoListResponse>(
          `/contests/${contestId}/modelPhoto`,
          {
            key: keyToRegister,
            title: title.trim(),
            description: description.trim() ? description.trim() : null,
          },
        );
      }
    } else {
      // fileなし（手動key）
      if (!keyToRegister) {
        setError('ファイルを選ぶか、手動で key を入力してください');
        return;
      }

      res = await api.post<ContestModelPhotoListResponse>(
        `/contests/${contestId}/modelPhoto`,
        {
          key: keyToRegister,
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
        },
      );
    }

    if (res.data.status === 'SUCCESS') {
      setMessage('モデル写真を登録しました');
      setTitle('');
      setDescription('');
      setFile(null);
      setManualKey('');
      await fetchPhotos();
      return;
    }

    if (res.data.status === 'FORBIDDEN') setError('権限がありません（作成者のみ登録可能）');
    else if (res.data.status === 'CONTEST_NOT_FOUND') setError('コンテストが見つかりません');
    else if (res.data.status === 'INVALID_REQUEST') setError('入力が不正です');
    else setError('モデル写真の登録に失敗しました');
  };

  const handleDelete = async (modelPhotoId: number) => {
    const ok = window.confirm('このモデル写真を削除しますか？');
    if (!ok) return;

    setMessage(null);
    setError(null);

    try {
      const res = await api.delete<ContestModelPhotoListResponse>(
        `/contests/${contestId}/modelPhoto/${modelPhotoId}`,
      );

      if (res.data.status === 'SUCCESS') {
        setMessage('モデル写真を削除しました');
        setPhotos((prev) => prev.filter((p) => p.id !== modelPhotoId));
        setDownloadUrlMap((prev) => {
          const next = new Map(prev);
          next.delete(modelPhotoId);
          return next;
        });
        return;
      }

      if (res.data.status === 'FORBIDDEN') setError('権限がありません（作成者のみ削除可能）');
      else if (res.data.status === 'MODEL_PHOTO_NOT_FOUND') setError('対象が見つかりません');
      else if (res.data.status === 'CONTEST_NOT_FOUND') setError('コンテストが見つかりません');
      else setError('削除に失敗しました');
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const s = err.response?.status;
        if (s === 401) return handle401();
        if (s === 403) {
          setError('権限がありません（作成者のみ削除可能）');
          return;
        }
      }
      console.error(err);
      setError('削除中にエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
        <div className="ml-auto text-xs space-x-4">
          <Link href="/admin/modify" className="hover:underline">
            コンテスト管理へ戻る
          </Link>
          <Link href="/" className="hover:underline">
            ユーザー画面へ
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            モデル写真管理（contestId: {contestId}）
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            モデル写真を追加・削除できます（作成者のみ操作可能）。
          </p>

          {/* 追加フォーム */}
          <div className="border border-gray-200 rounded p-4 mb-4">
            <h2 className="font-semibold mb-3">モデル写真を追加</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                タイトル（必須）
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：見本写真1"
                />
              </label>

              <label className="text-sm">
                説明（任意）
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例：夕景 / 山 / 海 など"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-3">
              <label className="text-sm">
                ファイル（ローカル: 直接アップロード / 本番: presignでS3へPUT→自動で登録）
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="text-sm">
                手動 key（presignが使えない時の保険）
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-3 py-2"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="contest-model-photos/12/xxxx.png"
                />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 text-sm rounded bg-black text-white hover:opacity-90"
              >
                追加
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-gray-500">読み込み中です...</p>}
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {message && <p className="text-sm text-blue-600 mb-2">{message}</p>}

          {!loading && !error && photos.length === 0 && (
            <p className="text-sm text-gray-500">モデル写真がありません。</p>
          )}

          {!loading && !error && photos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border-b text-left">ID</th>
                    <th className="px-3 py-2 border-b text-left">画像</th>
                    <th className="px-3 py-2 border-b text-left">タイトル</th>
                    <th className="px-3 py-2 border-b text-left">説明</th>
                    <th className="px-3 py-2 border-b text-left">Key</th>
                    <th className="px-3 py-2 border-b text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {photos.map((p) => {
                    const url = downloadUrlMap.get(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b align-top">{p.id}</td>
                        <td className="px-3 py-2 border-b align-top">
                          {url ? (
                            // Next/Imageだとドメイン設定が要るので<img>で簡易表示
                            <img
                              src={url}
                              alt={p.title}
                              className="w-20 h-20 object-cover rounded border border-gray-200"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              no image
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b align-top font-medium">{p.title}</td>
                        <td className="px-3 py-2 border-b align-top text-xs text-gray-700">
                          {p.description ?? '-'}
                        </td>
                        <td className="px-3 py-2 border-b align-top text-xs text-gray-600">
                          <code className="break-all">{p.key}</code>
                        </td>
                        <td className="px-3 py-2 border-b align-top">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="px-3 py-1 text-xs rounded border border-red-500 text-red-600 hover:bg-red-50"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={fetchPhotos}
                  className="px-3 py-1 text-xs rounded border border-gray-300"
                >
                  再読み込み
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}