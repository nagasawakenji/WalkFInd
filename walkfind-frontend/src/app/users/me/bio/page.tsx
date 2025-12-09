'use client';

import { useState, FormEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function EditBioPage() {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // 1. まず Amplify のセッションから取得を試みる
      let token: string | null = null;
      try {
        const session = await fetchAuthSession();
        console.log('fetchAuthSession result (bio page):', session);
        token = session.tokens?.idToken?.toString() ?? null;
        console.log('idToken (bio page):', token);
      } catch (e) {
        console.warn('fetchAuthSession failed, fallback to localStorage access_token', e);
      }

      // 2. 取得できなければ、自前で保存している access_token を使う
      if (!token && typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('access_token');
        console.log('fallback access_token from localStorage (bio page):', stored);
        token = stored;
      }

      if (!token) {
        setErrorMessage('ログイン情報が取得できませんでした。まずログインしてください。');
        return;
      }

      await axios.patch(
        `${API_BASE_URL}/profile/bio`,
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
        setErrorMessage('更新に失敗しました。時間をおいて再度お試しください。');
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
      {/* ナビゲーション（簡易版） */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-bold mb-4 border-b border-gray-200 pb-3">
            自己紹介文の編集
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
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {bio.length} / {maxLength} 文字
              </div>
            </div>

            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                {successMessage}
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Link
                href="/users/me"
                className="text-xs md:text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                ← プロフィールへ戻る
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
