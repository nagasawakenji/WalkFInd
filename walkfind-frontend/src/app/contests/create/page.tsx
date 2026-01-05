'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// ----------------------
// 型定義
// ----------------------
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

// ----------------------
// Page Component
// ----------------------
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
            case 'INTERNAL_SEVER_ERROR':
                setErrorMessage('サーバー内部エラーが発生しました。時間を置いて再度お試しください。');
                break;
            case 'FAILED':
            default:
                setErrorMessage(serverMessage || 'コンテストの作成に失敗しました。');
                break;
        }
    };

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
                        <span className="text-sm font-medium text-black">Create</span>
                    </div>
                </div>
            </nav>

            <div className="pt-24 max-w-3xl mx-auto px-4">
                
                {/* ページヘッダー */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
                            Create New Contest
                        </h1>
                        <p className="text-gray-500 text-sm">
                            新しいfindを開催しましょう。<br className="hidden md:inline"/>
                            テーマと期間を設定するだけで、すぐに募集を開始できます。
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        キャンセル
                    </button>
                </div>

                {/* フォームパネル */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* エラーメッセージエリア */}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
                            <span className="text-red-500 text-xl">⚠️</span>
                            <div>
                                <p className="text-red-700 font-bold text-sm">作成できませんでした</p>
                                <p className="text-red-600 text-xs mt-1">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        
                        {/* コンテスト名 */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-bold text-gray-900">
                                コンテスト名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="例: 道端の変な標識"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-gray-50 focus:bg-white text-base"
                            />
                            <p className="text-xs text-gray-400">
                                他のコンテストと被らない、ユニークで分かりやすい名前を入力してください。
                            </p>
                        </div>

                        {/* テーマ */}
                        <div className="space-y-2">
                            <label htmlFor="theme" className="block text-sm font-bold text-gray-900">
                                テーマ・詳細 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="theme"
                                name="theme"
                                required
                                rows={6}
                                value={formData.theme}
                                onChange={handleChange}
                                placeholder="募集する写真のテーマ、撮影ルール、審査基準などを詳しく入力してください..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-gray-50 focus:bg-white resize-none text-base leading-relaxed"
                            />
                            <p className="text-xs text-gray-400">
                                参加者がどのような写真を撮ればよいか、具体的に記載しましょう。
                            </p>
                        </div>

                        {/* 開催期間 */}
                        <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                📅 開催期間設定 <span className="text-red-500">*</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="startDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        START DATE
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="startDate"
                                        name="startDate"
                                        required
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="endDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        END DATE
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="endDate"
                                        name="endDate"
                                        required
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 送信エリア */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-4">
                            <p className="text-xs text-gray-400">
                                ※ 作成後は編集できない項目があります。内容をよくご確認ください。
                            </p>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    px-8 py-3 rounded-full font-bold text-sm shadow-lg transition-all transform hover:-translate-y-0.5
                                    ${loading
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-black text-white hover:bg-gray-800 hover:shadow-xl'
                                    }
                                `}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></span>
                                        Creating...
                                    </span>
                                ) : (
                                    'Create Contest'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}