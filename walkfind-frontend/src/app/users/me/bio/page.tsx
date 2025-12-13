'use client';

import { useState, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

// 環境変数（文字列なので boolean 化）
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

export default function EditBioPage() {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      console.log(`[BioUpdate] Mode: ${IS_LOCAL ? 'Local' : 'Production'}`);

      // ★ 修正ポイント: 環境によってパスを切り替える
      // ローカル: LocalUserProfileController (/api/v1/profile/bio)
      // 本番: UserProfileController (/api/v1/me/profile/bio)
      const endpointPath = IS_LOCAL ? '/profile/bio' : '/me/profile/bio';

      await api.patch(endpointPath, { bio });

      setSuccessMessage('自己紹介文を更新しました。');
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        console.error('update bio error response:', err.response);

        if (status === 401) {
          // 未ログイン/期限切れ
          localStorage.setItem('redirect_after_login', '/users/me/bio');
          router.replace('/login');
          return;
        }

        setErrorMessage(`更新に失敗しました: ${status ?? 'unknown'}`);
      } else if (err instanceof Error) {
        console.error('update bio error:', err);
        setErrorMessage(err.message);
      } else {
        console.error('update bio unknown error:', err);
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