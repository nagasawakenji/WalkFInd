'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import ContestIcon from '@/components/ContestIcon';

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

// コンテスト一覧のレスポンス型（必要な項目のみ）
interface ContestResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string; // ContestStatus（UPCOMING / IN_PROGRESS / FINISHED など）
  iconUrl?: string | null;
}

// 削除レスポンス型（DeleteContestController の戻り値を想定）
interface DeletingContestResponse {
  contestId: number | null;
  status: 'SUCCESS' | 'NOT_FOUND' | 'BUSINESS_RULE_VIOLATION' | 'FAILED' | 'INTERNAL_SERVER_ERROR';
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
  const [contests, setContests] = useState<ContestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // 開催中コンテスト一覧の取得
  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError(null);

      try {
        // ★ 必要に応じてクエリパラメータやパスを既存APIに合わせて修正してください
        // 例: /contests?status=IN_PROGRESS や /contests/active など
        const res = await axios.get<ContestResponse[]>(`${API_BASE_URL}/contests`, {
          params: { status: 'IN_PROGRESS' },
        });
        const contestsData = res.data;

        // コンテスト一覧が取得できたら、まとめてアイコン情報を取得
        let contestsWithIcon: ContestResponse[] = contestsData;

        if (contestsData.length > 0) {
          try {
            const idsParam = contestsData.map((c) => c.contestId).join(',');
            const iconRes = await axios.get<ContestIconListResponse>(
              `${API_BASE_URL}/contest-icons`,
              {
                params: { ids: idsParam },
              }
            );

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
      } catch (err) {
        const e = err as AxiosError;
        console.error('Failed to fetch contests', e);
        setError('コンテスト一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  // コンテスト削除
  const handleDelete = async (contestId: number) => {
    const ok = window.confirm('このコンテストを削除しますか？\n開催前のみ削除可能です。');
    if (!ok) return;

    setActionMessage(null);

    try {
      const res = await axios.delete<DeletingContestResponse>(`${API_BASE_URL}/contests/${contestId}`);
      const data = res.data;

      if (data.status === 'SUCCESS') {
        setContests((prev) => prev.filter((c) => c.contestId !== contestId));
        setActionMessage(data.message ?? 'コンテストを削除しました');
      } else {
        setActionMessage(data.message ?? 'コンテストの削除に失敗しました');
      }
    } catch (err) {
      const e = err as AxiosError;
      console.error('Failed to delete contest', e);
      setActionMessage('コンテストの削除中にエラーが発生しました');
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 管理用ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind Admin</span>
        <div className="ml-auto text-xs space-x-4">
          <Link href="/" className="hover:underline">
            ユーザー画面へ
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            コンテスト管理（開催中）
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            現在開催中のコンテスト一覧です。編集画面への遷移や削除を行えます。
          </p>

          {loading && <p className="text-sm text-gray-500">読み込み中です...</p>}
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {actionMessage && <p className="text-sm text-blue-600 mb-2">{actionMessage}</p>}

          {!loading && !error && contests.length === 0 && (
            <p className="text-sm text-gray-500">現在、開催中のコンテストはありません。</p>
          )}

          {!loading && !error && contests.length > 0 && (
            <div className="overflow-x-auto mt-4">
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
                        <div className="text-xs text-gray-500">〜 {new Date(contest.endDate).toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-2 border-b align-top text-xs">
                        <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700">
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
          )}
        </div>
      </div>
    </main>
  );
}
