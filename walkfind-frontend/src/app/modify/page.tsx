'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ContestIcon from '@/components/ContestIcon';

// 自分が作成した開催前コンテスト（ページング）
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

// 削除レスポンス型（DeleteContestController の戻り値を想定）
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

export default function ModifyContestListPage() {
  const [contests, setContests] = useState<MyContestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  // 自分が作成した開催前（UPCOMING）コンテスト一覧の取得（ページング）
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

        // コンテスト一覧が取得できたら、まとめてアイコン情報を取得
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
            // アイコン取得に失敗しても一覧自体は表示できるようにする
          }
        }

        setContests(contestsWithIcon);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          console.error('Failed to fetch contests', err.response);

          if (status === 401) {
            // 未ログイン/期限切れ
            localStorage.setItem('redirect_after_login', '/modify');
            router.replace('/login');
            return;
          }
        } else {
          console.error('Failed to fetch contests', err);
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
          // 現在ページが空になった場合は1つ前のページへ戻す（0未満にしない）
          if (next.length === 0 && page > 0) {
            setPage(page - 1);
          }
          return next;
        });
        setTotalCount((prev) => Math.max(prev - 1, 0));
        setActionMessage(data.message ?? 'コンテストを削除しました');
      } else {
        setActionMessage(data.message ?? 'コンテストの削除に失敗しました');
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        console.error('Failed to delete contest', err.response);

        if (status === 401) {
          localStorage.setItem('redirect_after_login', '/modify');
          router.replace('/login');
          return;
        }
      } else {
        console.error('Failed to delete contest', err);
      }

      setActionMessage('コンテストの削除中にエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 管理用ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
        <div className="ml-auto text-xs space-x-4">
          <Link href="/" className="hover:underline">
            ユーザー画面へ
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            自分のコンテスト管理（開催前）
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            あなたが作成した開催前（UPCOMING）のコンテスト一覧です。編集・削除ができます。
          </p>

          {loading && <p className="text-sm text-gray-500">読み込み中です...</p>}
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {actionMessage && <p className="text-sm text-blue-600 mb-2">{actionMessage}</p>}

          {!loading && !error && contests.length === 0 && (
            <p className="text-sm text-gray-500">現在、開催前のコンテストはありません。</p>
          )}

          {!loading && !error && contests.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <div className="text-xs text-gray-600">
                  全 {totalCount.toLocaleString()} 件 / ページ {page + 1} / {Math.max(1, Math.ceil(totalCount / size))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">表示件数</label>
                  <select
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    value={size}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setPage(0);
                      setSize(nextSize);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
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
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700">
                            {contest.status}
                          </span>
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
                              href={`/modify/${contest.contestId}/model-photos`}
                              className="px-3 py-1 text-xs rounded border border-purple-500 text-purple-700 hover:bg-purple-50 text-center"
                            >
                              モデル写真管理
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
