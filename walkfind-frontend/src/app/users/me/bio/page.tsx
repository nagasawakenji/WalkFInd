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

      // ローカル: LocalUserProfileController (/api/v1/profile/bio)
      // 本番: UserProfileController (/api/v1/me/profile/bio)
      const endpointPath = IS_LOCAL ? '/profile/bio' : '/me/profile/bio';

      await api.patch(endpointPath, { bio });

      setSuccessMessage('自己紹介文を更新しました。');
      
      // 少し待ってから戻ると親切かもしれません（任意）
      // setTimeout(() => router.push('/users/me'), 1500);
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
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Fixed Navbar (H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Edit Bio</span>
            </div>
        </div>
      </nav>

      <div className="pt-24 max-w-2xl mx-auto px-4">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2 flex items-center gap-2">
                    Edit Bio
                    {IS_LOCAL && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">LOCAL</span>}
                </h1>
                <p className="text-gray-500 text-sm">
                   プロフィールに表示される自己紹介文を編集します。
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

        {/* フォームカード */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* テキストエリア */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900" htmlFor="bio">
                自己紹介文
              </label>
              <div className="relative">
                <textarea
                    id="bio"
                    className="w-full min-h-[160px] rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all resize-none bg-gray-50 focus:bg-white"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, maxLength))}
                    maxLength={maxLength}
                    placeholder="例：何かを見つけるのが好きです。週末は発見を求めて色々歩き回っています。よろしくねー"
                    disabled={loading}
                />
                <div className="absolute bottom-3 right-3 text-xs font-mono font-bold text-gray-400 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-gray-100">
                    {bio.length} / {maxLength}
                </div>
              </div>
            </div>

            {/* メッセージエリア */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✅</span> {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>⚠️</span> {errorMessage}
              </div>
            )}

            {/* アクションボタン */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link
                href="/users/me"
                className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                マイページへ戻る
              </Link>

              <button
                type="submit"
                disabled={loading}
                className={`
                    px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
                    ${loading 
                        ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                        : 'bg-black hover:bg-gray-800 hover:shadow-xl'
                    }
                `}
              >
                {loading ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}