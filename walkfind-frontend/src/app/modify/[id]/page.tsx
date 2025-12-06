'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

// コンテスト詳細の型（必要な項目のみ）
interface ContestDetailResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string; // ISO文字列
  endDate: string;   // ISO文字列
  status: string;    // ContestStatus（UPCOMING / IN_PROGRESS / FINISHED など）
}

// 更新レスポンスの型
interface UpdatingContestResponse {
  contestId: number | null;
  status:
    | 'SUCCESS'
    | 'NOT_FOUND'
    | 'NAME_DUPLICATED'
    | 'INVALID_DATE'
    | 'BUSINESS_RULE_VIOLATION'
    | 'FAILED'
    | 'INTERNAL_SERVER_ERROR';
  name?: string;
  theme?: string;
  message?: string;
}

// アイコンレスポンスの型
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

// 日時文字列(ISO) → input[type=datetime-local] 用文字列
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

// input[type=datetime-local] → ISO文字列
const fromLocalInputValue = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function ModifyContestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = Number(params?.id);

  const [contest, setContest] = useState<ContestDetailResponse | null>(null);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconMessage, setIconMessage] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

  const isUpcoming = contest?.status === 'UPCOMING';

  // コンテスト詳細の取得
  useEffect(() => {
    if (!contestId || Number.isNaN(contestId)) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        // ★ バックエンドに合わせてURLを調整してください（例: /contests/{id}）
        const res = await axios.get<ContestDetailResponse>(`${API_BASE_URL}/contests/${contestId}`);
        const data = res.data;
        setContest(data);
        setName(data.name);
        setTheme(data.theme);
        setStartDateInput(toLocalInputValue(data.startDate));
        setEndDateInput(toLocalInputValue(data.endDate));
      } catch (err) {
        const e = err as AxiosError;
        console.error('Failed to fetch contest detail', e);
        setError('コンテスト情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [contestId]);

  // アイコン情報の取得
  useEffect(() => {
    if (!contestId || Number.isNaN(contestId)) return;

    const fetchIcon = async () => {
      setIconLoading(true);
      setIconMessage(null);
      try {
        const res = await axios.get<ContestIconListResponse>(`${API_BASE_URL}/contest-icons`, {
          params: { ids: contestId },
        });
        const icon = res.data.icons[0];
        if (icon && icon.iconUrl) {
          // iconUrl はそのまま img src として扱う前提（必要に応じてプレフィックス付与）
          setIconUrl(icon.iconUrl);
        } else {
          setIconUrl(null);
        }
      } catch (err) {
        console.error('Failed to fetch contest icon', err);
        setIconMessage('アイコン情報の取得に失敗しました');
      } finally {
        setIconLoading(false);
      }
    };

    fetchIcon();
  }, [contestId]);

  const getTokenOrRedirect = (): string | null => {
    // フロント側でのみ実行される前提（イベントハンドラ内）
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!token) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      localStorage.setItem('redirect_after_login', currentPath);

      const loginUrl = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
      if (loginUrl && typeof window !== 'undefined') {
        window.location.href = loginUrl;
      } else {
        router.push('/login');
      }
      return null;
    }

    return token;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contestId) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    const startIso = fromLocalInputValue(startDateInput);
    const endIso = fromLocalInputValue(endDateInput);

    if (!startIso || !endIso) {
      setError('開始日・終了日の形式が不正です');
      setSaving(false);
      return;
    }

    // アクセストークン取得（なければログインへリダイレクト）
    const token = getTokenOrRedirect();
    if (!token) {
      setSaving(false);
      return;
    }

    try {
      const res = await axios.put<UpdatingContestResponse>(
        `${API_BASE_URL}/contests/${contestId}`,
        {
          name,
          theme,
          startDate: startIso,
          endDate: endIso,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = res.data;
      setMessage(data.message ?? 'コンテスト情報を更新しました');
      setContest((prev) =>
        prev
          ? {
              ...prev,
              name,
              theme,
              startDate: startIso,
              endDate: endIso,
            }
          : prev
      );
    } catch (err) {
      const e = err as AxiosError<UpdatingContestResponse>;
      if (e.response?.data) {
        const data = e.response.data;
        setError(data.message ?? 'コンテスト情報の更新に失敗しました');
      } else {
        console.error('Failed to update contest', e);
        setError('コンテスト情報の更新中にエラーが発生しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIconFileChange = (fileList: FileList | null) => {
    setIconMessage(null);
    if (!fileList || fileList.length === 0) {
      setIconFile(null);
      return;
    }
    setIconFile(fileList[0]);
  };

  const handleIconUpload = async () => {
    if (!contestId || !iconFile) return;

    // アクセストークン取得
    const token = getTokenOrRedirect();
    if (!token) return;

    setIconLoading(true);
    setIconMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', iconFile);

      const res = await axios.post<ContestIconResponse>(
        `${API_BASE_URL}/contest-icons/${contestId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = res.data;
      if (data.success) {
        setIconUrl(data.iconUrl ?? null);
        setIconMessage(data.message ?? 'アイコンを更新しました');
      } else {
        setIconMessage(data.message ?? 'アイコンの更新に失敗しました');
      }
    } catch (err) {
      const e = err as AxiosError<ContestIconResponse>;
      console.error('Failed to upload icon', e);
      setIconMessage('アイコンのアップロード中にエラーが発生しました');
    } finally {
      setIconLoading(false);
    }
  };

  const handleIconDelete = async () => {
    if (!contestId) return;
    const ok = window.confirm('アイコンを削除しますか？');
    if (!ok) return;

    const token = getTokenOrRedirect();
    if (!token) return;

    setIconLoading(true);
    setIconMessage(null);

    try {
      const res = await axios.delete<ContestIconResponse>(
        `${API_BASE_URL}/contest-icons/${contestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = res.data;
      if (data.success) {
        setIconUrl(null);
        setIconFile(null);
        setIconMessage(data.message ?? 'アイコンを削除しました');
      } else {
        setIconMessage(data.message ?? 'アイコンの削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete icon', err);
      setIconMessage('アイコンの削除中にエラーが発生しました');
    } finally {
      setIconLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind Admin</span>
        <div className="ml-auto text-xs space-x-4">
          <Link href="/modify" className="hover:underline">
            コンテスト一覧へ
          </Link>
          <Link href="/" className="hover:underline">
            ユーザー画面へ
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            コンテスト編集
          </h1>

          {loading && <p className="text-sm text-gray-500">読み込み中です...</p>}
          {error && !loading && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {message && !loading && <p className="text-sm text-green-700 mb-2">{message}</p>}

          {!loading && contest && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                ID: {contest.contestId} / ステータス: {contest.status}
              </p>

              {!isUpcoming && (
                <p className="text-xs text-red-600 mb-4">
                  開催前のコンテストのみ編集可能です（現在のステータスでは更新は失敗します）。
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">コンテスト名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    disabled={saving}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">テーマ</label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日時</label>
                    <input
                      type="datetime-local"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      disabled={saving}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了日時</label>
                    <input
                      type="datetime-local"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    戻る
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? '更新中...' : '更新する'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* アイコン編集ブロック */}
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8">
          <h2 className="text-xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            コンテストアイコン
          </h2>

          {iconLoading && <p className="text-sm text-gray-500 mb-2">アイコン処理中です...</p>}
          {iconMessage && <p className="text-sm text-blue-700 mb-2">{iconMessage}</p>}

          <div className="flex flex-col md:flex-row gap-6 items-start mt-2">
            <div>
              <p className="text-xs text-gray-600 mb-2">現在のアイコン</p>
              {iconUrl ? (
                // 必要に応じてパスのプレフィックスを付与してください
                <img
                  src={iconUrl}
                  alt="contest icon"
                  className="w-24 h-24 object-cover rounded border border-gray-300 bg-gray-50"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center rounded border border-dashed border-gray-300 text-3xl bg-gray-50">
                  📸
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">アイコン画像を選択（正方形推奨）</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleIconFileChange(e.target.files)}
                  className="text-xs"
                  disabled={iconLoading}
                />
              </div>

              <div className="flex flex-wrap gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleIconUpload}
                  disabled={iconLoading || !iconFile}
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  アイコンをアップロード / 更新
                </button>
                <button
                  type="button"
                  onClick={handleIconDelete}
                  disabled={iconLoading || !iconUrl}
                  className="px-3 py-1.5 text-xs rounded border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  アイコンを削除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
