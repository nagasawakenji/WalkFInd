'use client';

import { useState, FormEvent, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';

// ★ 環境変数または NODE_ENV でローカル判定
const IS_LOCAL = process.env.NODE_ENV !== 'production';

// APIのベースURL設定
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_LOCAL
    ? "http://localhost:8080/api/v1"
    : "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1");

export default function EditBioPage() {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // トークン取得関数 (画像ページと同じロジック)
  const getToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.idToken) {
        return session.tokens.idToken.toString();
      }
    } catch (e) {
      console.warn('fetchAuthSession failed, checking localStorage');
    }
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('access_token');
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    const token = await getToken();
    if (!token) {
      setErrorMessage('ログイン情報が取得できませんでした。まずログインしてください。');
      setLoading(false);
      return;
    }

    try {
      console.log(`[BioUpdate] Mode: ${IS_LOCAL ? 'Local' : 'Production'}`);

      // ★ 修正ポイント: 環境によってパスを切り替える
      // ローカル: LocalUserProfileController (/api/v1/profile/bio)
      // 本番: UserProfileController (/api/v1/me/profile/bio)
      const endpointPath = IS_LOCAL ? '/profile/bio' : '/me/profile/bio';

      await axios.patch(
        `${API_BASE_URL}${endpointPath}`,
        { bio },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setSuccessMessage('自己紹介文を更新しました。');
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        console.error('update bio error response:', axiosError.response);
        setErrorMessage(`更新に失敗しました: ${axiosError.response.status}`);
      } else {
        console.error('update bio network error:', err);
        setErrorMessage('ネットワークエラーが発生しました。接続状況を確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const maxLength = 300;

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-bold mb-4 border-b border-gray-200 pb-3">
            自己紹介文の編集
            {IS_LOCAL && <span className="ml-2 text-xs text-blue-600 border border-blue-600 px-1 rounded">LOCAL</span>}
          </h1>

          <p className="text-sm text-gray-600 mb-4">
            プロフィールに表示される自己紹介文を編集できます。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bio">
                自己紹介文
              </label>
              <textarea
                id="bio"
                className="w-full min-h-[120px] rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, maxLength))}
                maxLength={maxLength}
                placeholder="例：都内の大学生です。週末に写真を撮りながら街歩きをするのが好きです。"
                disabled={loading}
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {bio.length} / {maxLength} 文字
              </div>
            </div>

            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                ✅ {successMessage}
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠️ {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 mt-4">
              <Link
                href="/users/me"
                className="text-sm text-gray-600 hover:text-black hover:underline"
              >
                キャンセル
              </Link>

              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded text-white transition-colors
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}
                `}
              >
                {loading ? '更新中…' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}