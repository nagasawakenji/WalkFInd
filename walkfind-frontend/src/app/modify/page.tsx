'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ContestIcon from '@/components/ContestIcon';

// ----------------------
// 型定義
// ----------------------
interface MyContestResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string; // "UPCOMING" を想定
  iconUrl?: string | null;
}

interface MyUpcomingContestsPageResponse {
  contests: MyContestResponse[];
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

// ----------------------
// Page Component
// ----------------------
export default function ModifyContestListPage() {
  const [contests, setContests] = useState<MyContestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  // コンテスト一覧取得
  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<MyUpcomingContestsPageResponse>('/contests/mine/upcoming', {
          params: { page, size },
        });

        const contestsData = res.data.contests;
        setTotalCount(res.data.totalCount);

        // アイコン取得
        let contestsWithIcon: MyContestResponse[] = contestsData;
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
          } catch (iconErr) {
            console.error('Failed to fetch contest icons', iconErr);
          }
        }
        setContests(contestsWithIcon);
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 401) {
          localStorage.setItem('redirect_after_login', '/modify');
          router.replace('/login');
          return;
        }
        setError('コンテスト一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [router, page, size]);

  // コンテスト削除
  const handleDelete = async (contestId: number) => {
    const ok = window.confirm('このコンテストを削除しますか？\n開催前のみ削除可能です。');
    if (!ok) return;

    setActionMessage(null);

    try {
      const res = await api.delete<DeletingContestResponse>(`/contests/${contestId}`);
      const data = res.data;

      if (data.status === 'SUCCESS') {
        setContests((prev) => {
          const next = prev.filter((c) => c.contestId !== contestId);
          if (next.length === 0 && page > 0) setPage(page - 1);
          return next;
        });
        setTotalCount((prev) => Math.max(prev - 1, 0));
        setActionMessage(data.message ?? 'コンテストを削除しました');
      } else {
        setActionMessage(data.message ?? 'コンテストの削除に失敗しました');
      }
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 401) {
        localStorage.setItem('redirect_after_login', '/modify');
        router.replace('/login');
        return;
      }
      setActionMessage('コンテストの削除中にエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {/* Fixed Navbar (H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Manage</span>
            </div>
            
            <Link href="/" className="text-xs font-bold px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                ユーザー画面へ
            </Link>
        </div>
      </nav>

      <div className="pt-24 max-w-6xl mx-auto px-4">
        
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
                   My Contests
                </h1>
                <p className="text-gray-500 text-sm">
                   あなたが作成した開催前（UPCOMING）のコンテスト管理画面です。
                </p>
            </div>
            <Link 
                href="/contests/create"
                className="px-5 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition shadow-lg flex items-center gap-2"
            >
                <span>+</span> Create New
            </Link>
        </div>

        {/* メッセージ表示 */}
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2">
                <span>⚠️</span> {error}
            </div>
        )}
        {actionMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold flex items-center gap-2">
                <span>ℹ️</span> {actionMessage}
            </div>
        )}

        {/* コンテンツエリア */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black mb-4"></div>
                <p className="text-gray-400 text-sm font-mono">Loading Contests...</p>
             </div>
          ) : contests.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-4xl mb-4 text-gray-300">📭</div>
                <p className="text-gray-500 font-bold">No Upcoming Contests</p>
                <p className="text-xs text-gray-400 mt-1">開催前のコンテストはありません。</p>
             </div>
          ) : (
            <>
              {/* コントロールバー */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total: {totalCount} items
                </div>

                <div className="flex items-center gap-3">
                  <select
                    className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                    value={size}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setPage(0);
                      setSize(nextSize);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>

                  <div className="flex items-center rounded-md border border-gray-300 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(p - 1, 0))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white border-r border-gray-200 transition"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={(page + 1) * size >= totalCount}
                        className="px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition"
                      >
                        Next
                      </button>
                  </div>
                </div>
              </div>

              {/* モダンテーブル (PC) / カードリスト (Mobile) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 bg-white sticky left-0 z-10">Contest</th>
                      <th className="px-6 py-4 bg-white">Theme</th>
                      <th className="px-6 py-4 bg-white">Schedule</th>
                      <th className="px-6 py-4 bg-white">Status</th>
                      <th className="px-6 py-4 bg-white text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contests.map((contest) => (
                      <tr key={contest.contestId} className="group hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-3">
                             <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                <ContestIcon iconUrl={contest.iconUrl} size={40} />
                             </div>
                             <div>
                                <div className="font-bold text-sm text-gray-900 line-clamp-1">{contest.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">ID: {contest.contestId}</div>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">{contest.theme}</p>
                        </td>
                        <td className="px-6 py-4 align-middle">
                           <div className="text-xs font-mono text-gray-500 whitespace-nowrap">
                              <div>Start: {new Date(contest.startDate).toLocaleDateString()}</div>
                              <div>End  : {new Date(contest.endDate).toLocaleDateString()}</div>
                           </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {contest.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 align-middle text-right">
                           <div className="flex items-center justify-end gap-2">
                              {/* 編集 */}
                              <Link
                                href={`/modify/${contest.contestId}`}
                                className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Edit Info"
                              >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </Link>
                              
                              {/* モデル写真管理 */}
                              <Link
                                href={`/modify/${contest.contestId}/model-photos`}
                                className="p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                                title="Manage Model Photos"
                              >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </Link>

                              {/* 削除 */}
                              <button
                                type="button"
                                onClick={() => handleDelete(contest.contestId)}
                                className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete Contest"
                              >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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