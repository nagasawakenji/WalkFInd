'use client';

import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// Environment variables
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ----------------------
// Types
// ----------------------
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
  photoUrl: string;
}

// ----------------------
// Page Component
// ----------------------
export default function AdminModelPhotosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contestId = useMemo(() => Number(params.id), [params.id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [photos, setPhotos] = useState<ContestModelPhotoItem[]>([]);
  const [downloadUrlMap, setDownloadUrlMap] = useState<Map<number, string>>(new Map());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Manual Key fallback
  const [manualKey, setManualKey] = useState('');
  const [showManualKey, setShowManualKey] = useState(false);

  const handle401 = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    try {
      localStorage.setItem('redirect_after_login', currentPath);
    } catch { /* ignore */ }
    router.replace('/login');
  };

  // Fetch Photos
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

      // Resolve URLs
      if (IS_LOCAL) {
        const nextMap = new Map<number, string>();
        for (const p of data.photos ?? []) {
          const encoded = encodeURIComponent(p.key);
          nextMap.set(p.id, `${API_BASE_URL}/local-storage/${encoded}`);
        }
        setDownloadUrlMap(nextMap);
      } else {
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
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const s = err.response?.status;
        if (s === 401) return handle401();
        if (s === 403) {
          setError('権限がありません');
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
    if (Number.isFinite(contestId)) {
      fetchPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  // Upload Logic
  const uploadViaPresign = async (f: File): Promise<string> => {
    if (IS_LOCAL) {
      throw new Error('Local mode does not support presigned upload.');
    }
    const dummyName = f.name || 'upload.png';
    const mimeType = f.type || 'application/octet-stream';

    const presign = await api.get<PresignedUrlResponse>('/upload/presigned-url', {
      params: {
        key: `contest-model-photos/${contestId}/${dummyName}`,
        contentType: mimeType,
      },
    });

    const { photoUrl: uploadUrl, key } = presign.data;

    await axios.put(uploadUrl, f, {
      headers: { 'Content-Type': mimeType },
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

    setUploading(true);

    try {
      let keyToRegister = manualKey.trim();
      let res;

      if (file) {
        if (IS_LOCAL) {
          const formData = new FormData();
          const requestPart = {
            title: title.trim(),
            description: description.trim() || null,
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
          keyToRegister = await uploadViaPresign(file);
          res = await api.post<ContestModelPhotoListResponse>(
            `/contests/${contestId}/modelPhoto`,
            {
              key: keyToRegister,
              title: title.trim(),
              description: description.trim() || null,
            },
          );
        }
      } else {
        if (!keyToRegister) {
          setError('ファイルを選択するか、手動でキーを入力してください');
          setUploading(false);
          return;
        }
        res = await api.post<ContestModelPhotoListResponse>(
          `/contests/${contestId}/modelPhoto`,
          {
            key: keyToRegister,
            title: title.trim(),
            description: description.trim() || null,
          },
        );
      }

      if (res.data.status === 'SUCCESS') {
        setMessage('モデル写真を登録しました');
        setTitle('');
        setDescription('');
        setFile(null);
        setPreviewUrl(null);
        setManualKey('');
        await fetchPhotos();
      } else {
        const s = res.data.status;
        if (s === 'FORBIDDEN') setError('権限がありません');
        else if (s === 'CONTEST_NOT_FOUND') setError('コンテストが見つかりません');
        else if (s === 'INVALID_REQUEST') setError('入力が不正です');
        else setError('登録に失敗しました');
      }
    } catch (err) {
      console.error(err);
      setError('登録中にエラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDelete = async (modelPhotoId: number) => {
    if (!window.confirm('削除してもよろしいですか？')) return;
    setMessage(null);
    setError(null);

    try {
      const res = await api.delete<ContestModelPhotoListResponse>(
        `/contests/${contestId}/modelPhoto/${modelPhotoId}`,
      );
      if (res.data.status === 'SUCCESS') {
        setMessage('削除しました');
        setPhotos((prev) => prev.filter((p) => p.id !== modelPhotoId));
        setDownloadUrlMap((prev) => {
          const next = new Map(prev);
          next.delete(modelPhotoId);
          return next;
        });
      } else {
        setError('削除できませんでした');
      }
    } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
            handle401();
            return;
        }
        setError('削除エラー');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Fixed Navbar (H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Model Photos</span>
            </div>
            
            <Link href="/modify" className="text-xs font-bold px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                一覧へ戻る
            </Link>
        </div>
      </nav>

      <div className="pt-24 max-w-5xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
               Manage Model Photos
            </h1>
            <p className="text-gray-500 text-sm">
               コンテスト（ID: {contestId}）の評価基準となるモデル写真を管理します。
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Registered Photos</h2>
                        <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200">{photos.length} items</span>
                    </div>

                    {loading ? (
                       <div className="flex justify-center items-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                       </div>
                    ) : photos.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-64 text-center">
                          <div className="text-4xl mb-4 text-gray-300">🖼️</div>
                          <p className="text-gray-500 font-bold">No Photos Yet</p>
                          <p className="text-xs text-gray-400 mt-1">右側のフォームから追加してください。</p>
                       </div>
                    ) : (
                       <ul className="divide-y divide-gray-50">
                          {photos.map((p) => {
                             const url = downloadUrlMap.get(p.id);
                             return (
                               <li key={p.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-4 group">
                                  {/* Thumbnail */}
                                  <div className="shrink-0 w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                                     {url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={url} alt={p.title} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                                     )}
                                  </div>
                                  
                                  {/* Info */}
                                  <div className="flex-grow min-w-0">
                                     <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
                                        <button 
                                            onClick={() => handleDelete(p.id)}
                                            className="text-gray-300 hover:text-red-600 transition-colors p-1"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                     </div>
                                     <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.description || <span className="text-gray-400 italic">No description</span>}</p>
                                     <div className="mt-3 flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">ID: {p.id}</span>
                                        <span className="text-[10px] font-mono text-gray-400 truncate max-w-[150px]" title={p.key}>{p.key}</span>
                                     </div>
                                  </div>
                               </li>
                             );
                          })}
                       </ul>
                    )}
                </div>
            </div>

            {/* Right Column: Add Form */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
                    <h2 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
                        <span>➕</span> Add New Photo
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-bold">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded font-bold">
                            {message}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* File Preview Area */}
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className={`
                                relative w-full aspect-video rounded-xl overflow-hidden border-4 
                                ${previewUrl ? 'border-black shadow-md' : 'border-gray-100 bg-gray-50'}
                            `}>
                                {previewUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full text-4xl text-gray-300">
                                        📷
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                写真を選択してください (Max 5MB)
                            </p>
                        </div>

                        {/* File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-bold
                                file:bg-gray-100 file:text-gray-700
                                hover:file:bg-gray-200
                                cursor-pointer
                            "
                            disabled={uploading}
                        />

                        {/* Title Input */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Title <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                                placeholder="Photo Title"
                                disabled={uploading}
                            />
                        </div>

                        {/* Description Input */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Description</label>
                            <textarea 
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
                                placeholder="Description (Optional)"
                                disabled={uploading}
                            />
                        </div>

                        {/* Manual Key Toggle */}
                        <div>
                            <button 
                                type="button" 
                                onClick={() => setShowManualKey(!showManualKey)}
                                className="text-xs text-gray-400 underline hover:text-gray-600"
                            >
                                {showManualKey ? 'Hide advanced options' : 'Advanced options'}
                            </button>
                            
                            {showManualKey && (
                                <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Manual S3 Key</label>
                                    <input 
                                        type="text"
                                        value={manualKey}
                                        onChange={(e) => setManualKey(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black/20"
                                        placeholder="path/to/image.jpg"
                                        disabled={uploading || !!file}
                                    />
                                    <p className="text-[10px] text-gray-400">※ファイル選択時は無効化されます</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={uploading || (!file && !manualKey) || !title}
                            className={`
                                w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5
                                ${uploading || (!file && !manualKey) || !title
                                    ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                                    : 'bg-black hover:bg-gray-800 hover:shadow-xl'}
                            `}
                        >
                            {uploading ? 'Uploading...' : 'Add Photo'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </main>
  );
}