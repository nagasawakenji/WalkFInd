'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
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
        <main className="container mx-auto px-4 py-10 max-w-2xl">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                {/* ヘッダー装飾 */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-4 w-full"></div>
                
                <div className="p-8">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-gray-800">コンテスト新規作成</h1>
                        <p className="text-gray-500 mt-2">
                            新しいテーマでフォトコンテストを開催しましょう
                        </p>
                    </div>

                    {/* エラーメッセージ表示エリア */}
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
                            <div className="flex items-center mb-1">
                                <span className="text-xl mr-2">⚠️</span>
                                <p className="font-bold">エラー</p>
                            </div>
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* コンテスト名 */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black"
                            />
                        </div>

                        {/* テーマ */}
                        <div>
                            <label htmlFor="theme" className="block text-sm font-bold text-gray-700 mb-2">
                                テーマ・詳細 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="theme"
                                name="theme"
                                required
                                rows={4}
                                value={formData.theme}
                                onChange={handleChange}
                                placeholder="どのような写真を募集するか、詳細なルールなどを入力してください"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none text-black"
                            />
                        </div>

                        {/* 開催期間 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-bold text-gray-700 mb-2">
                                    開始日時 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    id="startDate"
                                    name="startDate"
                                    required
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black"
                                />
                            </div>

                            <div>
                                <label htmlFor="endDate" className="block text-sm font-bold text-gray-700 mb-2">
                                    終了日時 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    id="endDate"
                                    name="endDate"
                                    required
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black"
                                />
                            </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 px-6 rounded-lg text-white font-bold text-lg shadow-md transition duration-200
                                ${loading 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                                }`}
                            >
                                {loading ? '作成中...' : 'コンテストを作成する'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </main>
    );
}
