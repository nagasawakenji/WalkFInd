'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';
import { uploadProfileImage } from '@/lib/upload';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function EditProfileImagePage() {
  const [profileImageKey, setProfileImageKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);

    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // ファイルもキーも指定がない場合はエラー
      if (!file && !profileImageKey) {
        setErrorMessage('プロフィール画像を選択してください。');
        return;
      }

      // まずは「ファイルが選択されている場合」の処理:
      // PUT /api/v1/profile/profile-image を叩く uploadProfileImage を利用する
      if (file) {
        try {
          const updatedUrl = await uploadProfileImage(file);
          // サーバー側でプロフィール画像が更新されている前提
          setSuccessMessage('プロフィール画像を更新しました。');
          if (updatedUrl) {
            setProfileImageKey(updatedUrl);
          }
          setFile(null);
          setPreviewUrl(null);
          return; // ファイルアップロード経由の場合はここで終了
        } catch (uploadErr) {
          console.error('profile image upload error:', uploadErr);
          setErrorMessage('画像のアップロードに失敗しました。時間をおいて再度お試しください。');
          return;
        }
      }

      // ここに到達するのは「ファイルは選択されていないが、キーは指定されている」ケース
      // 従来どおり PATCH /api/v1/profile/image を使ってキー指定で更新する
      let token: string | null = null;
      try {
        const session = await fetchAuthSession();
        console.log('fetchAuthSession result (image page):', session);
        token = session.tokens?.idToken?.toString() ?? null;
        console.log('idToken (image page):', token);
      } catch (e) {
        console.warn('fetchAuthSession failed, fallback to localStorage access_token (image page)', e);
      }

      if (!token && typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('access_token');
        console.log('fallback access_token from localStorage (image page):', stored);
        token = stored;
      }

      if (!token) {
        setErrorMessage('ログイン情報が取得できませんでした。まずログインしてください。');
        return;
      }

      await axios.patch(
        `${API_BASE_URL}/profile/image`,
        { profileImageUrl: profileImageKey },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setSuccessMessage('プロフィール画像を更新しました。');
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        console.error('update profile image error response:', axiosError.response);
        setErrorMessage('更新に失敗しました。時間をおいて再度お試しください。');
      } else {
        console.error('update profile image network error:', err);
        setErrorMessage('ネットワークエラーが発生しました。接続状況を確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* ナビゲーション（簡易版） */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-bold mb-4 border-b border-gray-200 pb-3">
            プロフィール画像の変更
          </h1>

          <p className="text-sm text-gray-600 mb-4">
            すでにアップロード済みの画像の S3 オブジェクトキー（または画像URL）を指定して、
            プロフィール画像として設定します。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="profileImageFile">
                  プロフィール画像ファイルを選択
                </label>
                <input
                  id="profileImageFile"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleFileChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  画像を選択すると、自動的にアップロードされ、その画像がプロフィール画像として設定されます。
                </p>
              </div>

              {previewUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="プレビュー" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-gray-500">選択中の画像プレビュー</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor="profileImageKey">
                  もしくは、すでにアップロード済みの画像キー / 画像URL を直接指定
                </label>
                <input
                  id="profileImageKey"
                  type="text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={profileImageKey}
                  onChange={(e) => setProfileImageKey(e.target.value)}
                  placeholder="例: user-profile-images/1234567890.png"
                />
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
