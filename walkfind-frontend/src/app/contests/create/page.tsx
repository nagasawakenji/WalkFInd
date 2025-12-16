'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// 型定義
interface CreatingContestRequest {
    name: string;
    theme: string;
    startDate: string;
    endDate: string;
}

type CreationContestStatus =
 | 'SUCCESS'
 | 'NAME_DUPLICATED'
 | 'INVALID_DATE'
 | 'FAILED'
 | 'INTERNAL_SEVER_ERROR';

interface CreatingContestResponse {
    contestId: number | null;
    status: CreationContestStatus;
    name: string;
    theme: string;
    message: string;
}

const isCreationContestStatus = (v: unknown): v is CreationContestStatus =>
  v === 'SUCCESS' ||
  v === 'NAME_DUPLICATED' ||
  v === 'INVALID_DATE' ||
  v === 'FAILED' ||
  v === 'INTERNAL_SEVER_ERROR';

export default function CreatingContestPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        theme: '',
        startDate: '',
        endDate: '',
    });

    // 入力変更時のハンドラ
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    }

    // 送信ハンドラ
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            // 日付の変換の実行
            const startIso = new Date(formData.startDate).toISOString();
            const endIso = new Date(formData.endDate).toISOString();

            const requestBody: CreatingContestRequest = {
                name: formData.name,
                theme: formData.theme,
                startDate: startIso,
                endDate: endIso,
            };

            // APIリクエスト
            const res = await api.post<CreatingContestResponse>('/contests', requestBody);

            const resData = res.data;

            if (resData.status === 'SUCCESS' && resData.contestId) {
                alert('コンテストを作成しました!');
                // コンテストページへ遷移
                router.push(`/contests/${resData.contestId}`);
            } else {
                handleBackendError(resData.status, resData.message);
            }
        } catch (error: unknown) {
            console.error('Create contest error:', error);

            if (isAxiosError(error)) {
                const statusCode = error.response?.status;

                // 未ログイン/期限切れ
                if (statusCode === 401) {
                    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/contests/create';
                    try {
                        localStorage.setItem('redirect_after_login', currentPath);
                    } catch {
                        // ignore
                    }
                    router.replace('/login');
                    return;
                }

                // バックエンドがCreatingContestResponse形式で返している場合はそれを優先
                const data = error.response?.data as Partial<CreatingContestResponse> | undefined;
                if (data && typeof data === 'object' && 'status' in data) {
                    const status = (data as { status?: unknown }).status;
                    const message = (data as { message?: unknown }).message;

                    if (isCreationContestStatus(status)) {
                        handleBackendError(status, typeof message === 'string' ? message : '');
                    } else {
                        setErrorMessage(`コンテストの作成に失敗しました: ${statusCode ?? 'unknown'}`);
                    }
                } else {
                    setErrorMessage(`コンテストの作成に失敗しました: ${statusCode ?? 'unknown'}`);
                }

                return;
            }

            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('ネットワークエラーが発生しました。接続状況を確認してください。');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackendError = (status: CreationContestStatus, serverMessage: string) => {
        switch (status) {
            case 'NAME_DUPLICATED':
                setErrorMessage('そのコンテスト名は既に使用されています。別の名前を指定してください。');
                break;
            case 'INVALID_DATE':
                setErrorMessage('開催期間が不正です。開始日は終了日より前である必要があります。');
                break;
            case 'INTERNAL_SEVER_ERROR': // Java側のスペル (SEVER) に合わせる
                setErrorMessage('サーバー内部エラーが発生しました。時間を置いて再度お試しください。');
                break;
            case 'FAILED':
            default:
                setErrorMessage(serverMessage || 'コンテストの作成に失敗しました。');
                break;
        }
    };

    return (
        <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
            {/* Top Nav (match other pages) */}
            <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
                <span className="font-bold text-lg tracking-tight">WalkFind</span>
                <div className="ml-auto text-xs space-x-4">
                    <Link href="/" className="hover:underline">
                        ユーザー画面へ
                    </Link>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="hover:underline"
                    >
                        戻る
                    </button>
                </div>
            </nav>

            <div className="max-w-3xl mx-auto px-4 pb-12">
                <div className="bg-white rounded border border-gray-300 p-6 md:p-8 shadow-sm">
                    <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
                        コンテスト新規作成
                    </h1>
                    <p className="text-sm text-gray-600 mb-6">
                        新しいテーマでフォトコンテストを開催しましょう。開催前に内容を確認してから公開できます。
                    </p>

                    {/* エラーメッセージ */}
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                            <div className="font-semibold mb-1">エラー</div>
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* コンテスト名 */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                コンテスト名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="例: 第1回 下北沢お散歩フォトコンテスト"
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/10 text-black"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                他のコンテストと区別しやすい名称にすると参加者が迷いません。
                            </p>
                        </div>

                        {/* テーマ */}
                        <div>
                            <label htmlFor="theme" className="block text-sm font-semibold text-gray-700 mb-2">
                                テーマ・詳細 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="theme"
                                name="theme"
                                required
                                rows={5}
                                value={formData.theme}
                                onChange={handleChange}
                                placeholder="募集する写真のテーマ、撮影ルール、NG事項などを入力してください"
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/10 resize-none text-black"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                参加者が誤解しないよう、具体例や禁止事項がある場合は明記してください。
                            </p>
                        </div>

                        {/* 開催期間 */}
                        <div>
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                                開催期間 <span className="text-red-500">*</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs text-gray-600 mb-1">
                                        開始日時
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="startDate"
                                        name="startDate"
                                        required
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/10 text-black"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs text-gray-600 mb-1">
                                        終了日時
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="endDate"
                                        name="endDate"
                                        required
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/10 text-black"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ボタン */}
                        <div className="pt-2 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm rounded border border-gray-400 text-gray-700 hover:bg-gray-50"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 text-sm rounded border text-center transition-colors ${
                                    loading
                                        ? 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {loading ? '作成中...' : '作成する'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
