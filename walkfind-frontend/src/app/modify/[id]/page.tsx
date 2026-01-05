'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios, { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// 環境変数（文字列なので boolean 化）
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

// ----------------------
// 型定義
// ----------------------
interface ContestDetailResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface UpdatingContestResponse {
  contestId: number | null;
  status: string;
  name?: string;
  theme?: string;
  message?: string;
}

interface ContestIconResponse {
  contestId: number;
  iconUrl: string | null;
  success?: boolean;
  message?: string;
}

interface ContestIconListResponse {
  icons: ContestIconResponse[];
  totalCount: number;
}

interface PresignedUrlResponse {
  photoUrl: string;
  key: string;
}

// ----------------------
// ユーティリティ
// ----------------------
const toLocalInputValue = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

const fromLocalInputValue = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

// ----------------------
// Page Component
// ----------------------
export default function ModifyContestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = Number(params?.id);

  // コンテスト情報 State
  const [contest, setContest] = useState<ContestDetailResponse | null>(null);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // アイコン関連 State
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconMessage, setIconMessage] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null); // プレビュー用

  const isUpcoming = contest?.status === 'UPCOMING';

  const redirectToLogin = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    try {
      localStorage.setItem('redirect_after_login', currentPath);
    } catch { /* ignore */ }
    router.replace('/login');
  };

  // 1. コンテスト詳細取得
  useEffect(() => {
    if (!contestId || Number.isNaN(contestId)) return;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ContestDetailResponse>(`/contests/${contestId}`);
        const data = res.data;
        setContest(data);
        setName(data.name);
        setTheme(data.theme);
        setStartDateInput(toLocalInputValue(data.startDate));
        setEndDateInput(toLocalInputValue(data.endDate));
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 401) {
            redirectToLogin();
            return;
        }
        setError('コンテスト情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [contestId]);

  // 2. アイコン情報取得
  useEffect(() => {
    if (!contestId || Number.isNaN(contestId)) return;
    const fetchIcon = async () => {
      setIconLoading(true);
      try {
        const res = await api.get<ContestIconListResponse>('/contest-icons', {
          params: { ids: contestId },
        });
        const icon = res.data.icons[0];
        const url = icon?.iconUrl ?? null;
        setIconUrl(url);
        // 初期プレビューとして現在のアイコンを設定
        if (url) setIconPreviewUrl(url);
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setIconLoading(false);
      }
    };
    fetchIcon();
  }, [contestId]);

  // 更新ハンドラ
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contestId) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    const startIso = fromLocalInputValue(startDateInput);
    const endIso = fromLocalInputValue(endDateInput);
    if (!startIso || !endIso) {
      setError('日時形式が不正です');
      setSaving(false);
      return;
    }

    try {
      const res = await api.put<UpdatingContestResponse>(
        `/contests/${contestId}`,
        { name, theme, startDate: startIso, endDate: endIso }
      );
      setMessage(res.data.message ?? 'コンテスト情報を更新しました');
      setContest((prev) => prev ? { ...prev, name, theme, startDate: startIso, endDate: endIso } : prev);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
        redirectToLogin();
        return;
      }
      setError('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // アイコンファイル選択
  const handleIconFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIconMessage(null);
    const file = e.target.files?.[0];

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズは5MB以下にしてください');
            return;
        }
        setIconFile(file);
        setIconPreviewUrl(URL.createObjectURL(file));
    } else {
        setIconFile(null);
        // ファイル選択解除時は元のアイコンに戻す（あれば）
        setIconPreviewUrl(iconUrl);
    }
  };

  // アイコンアップロード
  const handleIconUpload = async () => {
    if (!contestId || !iconFile) return;

    setIconLoading(true);
    setIconMessage(null);

    console.log(`[IconUpload] Mode: ${IS_LOCAL ? 'Local' : 'Production'}`);

    try {
      if (IS_LOCAL) {
        // Local: FormData直接送信
        const formData = new FormData();
        formData.append('file', iconFile);

        const res = await api.post<ContestIconResponse>(
          `/contest-icons/${contestId}`,
          formData
        );
        const data = res.data;
        if (data.success) {
          setIconUrl(data.iconUrl ?? null);
          setIconMessage(data.message ?? 'アイコンを更新しました');
          setIconFile(null); // ファイル選択状態解除
        } else {
          setIconMessage(data.message ?? '更新失敗');
        }

      } else {
        // Production: Presigned URL
        const mimeType = iconFile.type || 'application/octet-stream';
        const baseKey = `contest-icons/${contestId}/${iconFile.name}`;

        // 1. URL取得
        const presignRes = await api.get<PresignedUrlResponse>('/upload/presigned-url', {
          params: {
            key: baseKey,
            contentType: mimeType,
          },
        });
        const { photoUrl: uploadUrl, key: finalS3Key } = presignRes.data;

        // 2. S3へPUT
        await axios.put(uploadUrl, iconFile, {
          headers: { 'Content-Type': mimeType },
        });

        // 3. 完了通知
        const registerRes = await api.post<ContestIconResponse>(
          `/contest-icons/${contestId}`,
          { key: finalS3Key }
        );
        const data = registerRes.data;
        if (data.success) {
          setIconUrl(data.iconUrl ?? null);
          setIconMessage(data.message ?? 'アイコンを更新しました');
          setIconFile(null);
        } else {
          setIconMessage(data.message ?? '更新失敗');
        }
      }
    } catch (err: unknown) {
      console.error('Failed to upload icon', err);
      if (isAxiosError(err) && err.response?.status === 401) {
         redirectToLogin();
         return;
      }
      setIconMessage('アップロード中にエラーが発生しました');
    } finally {
      setIconLoading(false);
    }
  };

  // アイコン削除
  const handleIconDelete = async () => {
    if (!contestId) return;
    if (!window.confirm('アイコンを削除しますか？')) return;

    setIconLoading(true);
    setIconMessage(null);

    try {
      const res = await api.delete<ContestIconResponse>(`/contest-icons/${contestId}`);
      const data = res.data;
      if (data.success) {
        setIconUrl(null);
        setIconPreviewUrl(null);
        setIconFile(null);
        setIconMessage(data.message ?? '削除しました');
      } else {
        setIconMessage(data.message ?? '削除失敗');
      }
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
          redirectToLogin();
          return;
      }
      setIconMessage('削除エラー');
    } finally {
      setIconLoading(false);
    }
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* Fixed Navbar (H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Edit Contest</span>
            </div>
            
            <Link href="/modify" className="text-xs font-bold px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                一覧へ戻る
            </Link>
        </div>
      </nav>

      <div className="pt-24 max-w-4xl mx-auto px-4">
        
        {/* ヘッダーエリア */}
        <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
               Edit Contest
            </h1>
            <p className="text-gray-500 text-sm">
               コンテスト情報の編集とアイコンの設定を行います。
            </p>
        </div>

        {loading ? (
           <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
           </div>
        ) : !contest ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
               <p className="text-gray-500">コンテストが見つかりませんでした。</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Left Column: 基本情報フォーム --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <div className="flex items-center justify-between mb-6">
                           <h2 className="text-lg font-bold text-black">基本情報</h2>
                           <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">ID: {contest.contestId}</span>
                        </div>

                        {!isUpcoming && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">
                                <span>⚠️</span>
                                <span>開催期間中または終了後のため、編集は制限されています。</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">コンテスト名</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 focus:bg-white bg-gray-50 transition-all text-sm"
                                    disabled={saving} 
                                    required 
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">テーマ・詳細</label>
                                <textarea 
                                    rows={4}
                                    value={theme} 
                                    onChange={(e) => setTheme(e.target.value)} 
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 focus:bg-white bg-gray-50 transition-all text-sm resize-none"
                                    disabled={saving} 
                                    required 
                                />
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">開始日時</label>
                                    <input type="datetime-local" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" disabled={saving} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">終了日時</label>
                                    <input type="datetime-local" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" disabled={saving} required />
                                </div>
                            </div>

                            {/* メッセージ表示 */}
                            {message && (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2 font-bold animate-in fade-in">
                                    <span>✅</span> {message}
                                </div>
                            )}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 font-bold animate-in fade-in">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={saving} 
                                    className={`px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5
                                        ${saving ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-black hover:bg-gray-800 hover:shadow-xl'}
                                    `}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* --- Right Column: アイコン設定 --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-lg font-bold text-black mb-6">Contest Icon</h2>
                        
                        <div className="flex flex-col items-center justify-center space-y-4 mb-6">
                            <div className={`
                                relative w-32 h-32 rounded-2xl overflow-hidden border-4 
                                ${iconPreviewUrl ? 'border-black shadow-md' : 'border-gray-100 bg-gray-50'}
                            `}>
                                {iconPreviewUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={iconPreviewUrl} alt="Icon Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full text-4xl text-gray-300">
                                        📷
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                推奨サイズ: 500x500px (Max 5MB)
                            </p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleIconFileChange}
                                disabled={iconLoading}
                                className="block w-full text-xs text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-xs file:font-bold
                                    file:bg-gray-100 file:text-gray-700
                                    hover:file:bg-gray-200
                                    cursor-pointer
                                "
                            />
                            
                            {/* アイコン用メッセージ */}
                            {iconMessage && (
                                <div className="text-xs font-bold text-center py-2 px-3 bg-blue-50 text-blue-600 rounded-lg">
                                    {iconMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleIconUpload}
                                    disabled={iconLoading || !iconFile}
                                    className={`
                                        py-2.5 rounded-lg text-xs font-bold transition-all
                                        ${(iconLoading || !iconFile) 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}
                                    `}
                                >
                                    {iconLoading ? '...' : 'Upload'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleIconDelete}
                                    disabled={iconLoading || !iconUrl}
                                    className={`
                                        py-2.5 rounded-lg text-xs font-bold transition-all border
                                        ${(iconLoading || !iconUrl)
                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                                            : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'}
                                    `}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
      </div>
    </main>
  );
}