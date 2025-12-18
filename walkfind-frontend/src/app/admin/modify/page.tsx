'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ContestIcon from '@/components/ContestIcon';

interface AdminContestResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
  createdByUserId: string | null;
  removedAt: string | null;
  iconUrl?: string | null;
}

interface AdminContestsPageResponse {
  contests: AdminContestResponse[];
  totalCount: number;
  page: number;
  size: number;
}

interface DeletingContestResponse {
  contestId: number | null;
  status:
    | 'SUCCESS'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'BUSINESS_RULE_VIOLATION'
    | 'FAILED'
    | 'INTERNAL_SERVER_ERROR';
  message?: string;
}

interface ContestIconResponse {
  contestId: number;
  iconUrl: string | null;
  success: boolean;
  message?: string;
}
interface ContestIconListResponse {
  icons: ContestIconResponse[];
  totalCount: number;
}

export default function AdminModifyPage() {
  const router = useRouter();

  const [contests, setContests] = useState<AdminContestResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [status, setStatus] = useState<string>(''); // '' = 全部
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<AdminContestsPageResponse>('/admin/contests', {
          params: {
            page,
            size,
            status: status || undefined,
            includeRemoved,
            keyword: keywordQuery.trim() ? keywordQuery.trim() : undefined,
          },
        });

        const contestsData = res.data.contests;
        setTotalCount(res.data.totalCount);

        // アイコンまとめ取得（失敗しても表示は継続）
        let contestsWithIcon: AdminContestResponse[] = contestsData;

        if (contestsData.length > 0) {
          try {
            const idsParam = contestsData.map((c) => c.contestId).join(',');
            const iconRes = await api.get<ContestIconListResponse>('/contest-icons', {
              params: { ids: idsParam },
            });

            const iconMap = new Map<number, string | null>();
            iconRes.data.icons.forEach((icon) => {
              iconMap.set(icon.contestId, icon.iconUrl ?? null);
            });

            contestsWithIcon = contestsData.map((c) => ({
              ...c,
              iconUrl: iconMap.get(c.contestId) ?? null,
            }));
          } catch (e) {
            console.error('Failed to fetch contest icons', e);
          }
        }

        setContests(contestsWithIcon);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const httpStatus = err.response?.status;
          if (httpStatus === 401) {
            localStorage.setItem('redirect_after_login', '/admin/modify');
            router.replace('/login');
            return;
          }
          if (httpStatus === 403) {
            setError('管理者権限がありません');
            return;
          }
        }
        console.error('Failed to fetch admin contests', err);
        setError('コンテスト一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [router, page, size, status, includeRemoved, keywordQuery]);

  const handleSearch = () => {
    // 検索は page を 0 に戻し、入力値をクエリとして確定
    setPage(0);
    setKeywordQuery(keywordInput.trim());
  };

  const handleDelete = async (contestId: number) => {
    const ok = window.confirm('このコンテストを削除（論理削除）しますか？');
    if (!ok) return;

    setActionMessage(null);

    try {
      const res = await api.delete<DeletingContestResponse>(`/contests/${contestId}`);
      const data = res.data;

      if (data.status === 'SUCCESS') {
        setActionMessage(data.message ?? 'コンテストを削除しました');

        // includeRemoved=false の時は一覧から除去、trueの時は再取得が正確
        if (!includeRemoved) {
          setContests((prev) => {
            const next = prev.filter((c) => c.contestId !== contestId);
            if (next.length === 0 && page > 0) setPage(page - 1);
            return next;
          });
          setTotalCount((prev) => Math.max(prev - 1, 0));
        } else {
          // removedAtが付くので再取得が簡単
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          setPage((p) => p);
        }
      } else {
        setActionMessage(data.message ?? 'コンテストの削除に失敗しました');
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const httpStatus = err.response?.status;
        if (httpStatus === 401) {
          localStorage.setItem('redirect_after_login', '/admin/modify');
          router.replace('/login');
          return;
        }
        if (httpStatus === 403) {
          setActionMessage('管理者権限がありません');
          return;
        }
      }
      console.error('Failed to delete contest', err);
      setActionMessage('コンテストの削除中にエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind Admin</span>
        <div className="ml-auto text-xs space-x-4">
          <Link href="/" className="hover:underline">
            ユーザー画面へ
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            管理者：コンテスト管理
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            全コンテストを一覧できます（削除済み表示も可）。編集・削除ができます。
          </p>

          {/* フィルタ */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center mb-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Status</label>
              <select
                className="text-xs border border-gray-300 rounded px-2 py-1"
                value={status}
                onChange={(e) => {
                  setPage(0);
                  setStatus(e.target.value);
                }}
              >
                <option value="">全部</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="CLOSED_VOTING">CLOSED_VOTING</option>
                <option value="ANNOUNCED">ANNOUNCED</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={includeRemoved}
                onChange={(e) => {
                  setPage(0);
                  setIncludeRemoved(e.target.checked);
                }}
              />
              削除済みも表示
            </label>

            <div className="flex items-center gap-2 md:ml-auto">
              <input
                className="text-xs border border-gray-300 rounded px-2 py-1 w-64"
                placeholder="name/theme 検索"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="px-3 py-1 text-xs rounded border border-gray-300"
              >
                検索
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-gray-500">読み込み中です...</p>}
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {actionMessage && <p className="text-sm text-blue-600 mb-2">{actionMessage}</p>}

          {!loading && !error && contests.length === 0 && (
            <p className="text-sm text-gray-500">コンテストがありません。</p>
          )}

          {!loading && !error && contests.length > 0 && (
            <>
              {/* ページング */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <div className="text-xs text-gray-600">
                  全 {totalCount.toLocaleString()} 件 / ページ {page + 1} / {totalPages}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">表示件数</label>
                  <select
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    value={size}
                    onChange={(e) => {
                      setPage(0);
                      setSize(Number(e.target.value));
                    }}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    disabled={page === 0}
                    className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * size >= totalCount}
                    className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50"
                  >
                    次へ
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto mt-3">
                <table className="min-w-full text-sm border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border-b text-left">ID</th>
                      <th className="px-3 py-2 border-b text-left">名前</th>
                      <th className="px-3 py-2 border-b text-left">テーマ</th>
                      <th className="px-3 py-2 border-b text-left">期間</th>
                      <th className="px-3 py-2 border-b text-left">ステータス</th>
                      <th className="px-3 py-2 border-b text-left">作成者</th>
                      <th className="px-3 py-2 border-b text-left">削除</th>
                      <th className="px-3 py-2 border-b text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contests.map((contest) => (
                      <tr key={contest.contestId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border-b align-top">{contest.contestId}</td>
                        <td className="px-3 py-2 border-b align-top">
                          <div className="flex items-center gap-2">
                            <ContestIcon iconUrl={contest.iconUrl} size={32} />
                            <span className="font-medium">{contest.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b align-top">{contest.theme}</td>
                        <td className="px-3 py-2 border-b align-top whitespace-nowrap">
                          <div>{new Date(contest.startDate).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            〜 {new Date(contest.endDate).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b align-top text-xs">
                          <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {contest.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b align-top text-xs">
                          {contest.createdByUserId ?? '-'}
                        </td>
                        <td className="px-3 py-2 border-b align-top text-xs">
                          {contest.removedAt ? (
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700">
                              削除済み
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700">
                              有効
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b align-top">
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Link
                              href={`/modify/${contest.contestId}`}
                              className="px-3 py-1 text-xs rounded border border-blue-500 text-blue-600 hover:bg-blue-50 text-center"
                            >
                              編集
                            </Link>

                            <Link
                              href={`/admin/modify/${contest.contestId}/photos`}
                              className="px-3 py-1 text-xs rounded border border-gray-500 text-gray-700 hover:bg-gray-50 text-center"
                            >
                              写真削除ページへ
                            </Link>
                            

                            <button
                              type="button"
                              onClick={() => handleDelete(contest.contestId)}
                              className="px-3 py-1 text-xs rounded border border-red-500 text-red-600 hover:bg-red-50"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}