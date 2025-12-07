'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAuthSession } from 'aws-amplify/auth';

// cognitoのログインURL
const COGNITO_LOGIN_URL =
  'https://walkfind-auth.auth.ap-northeast-1.amazoncognito.com/login' +
  '?client_id=3n38j4erbgfcanu6v9n87he38r' +
  '&response_type=code' +
  '&scope=email+openid+phone' +
  '&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback';

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        // accessToken / idToken のどちらかが取得できればログイン状態とみなす
        const token =
          session.tokens?.accessToken?.toString() ??
          session.tokens?.idToken?.toString() ??
          null;

        if (token) {
          setIsLoggedIn(true);
          return;
        }
      } catch (e) {
        console.warn('fetchAuthSession failed on HomePage:', e);
      }

      // Amplify セッションが取れない場合は localStorage のトークンを確認
      if (typeof window !== 'undefined') {
        const storedAccess = window.localStorage.getItem('access_token');
        const storedId = window.localStorage.getItem('id_token');
        if (storedAccess || storedId) {
          setIsLoggedIn(true);
        }
      }
    };

    checkAuth();
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg tracking-tight">WalkFind</span>

          {/* 未ログイン時: ログインボタン */}
          {!isLoggedIn && (
            <a
              href={COGNITO_LOGIN_URL}
              className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
            >
              ログイン
            </a>
          )}

          {/* ログイン時: マイページ & ログアウトボタン */}
          {isLoggedIn && (
            <>
              <Link
                href="/users/me"
                className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
              >
                マイページ
              </Link>
              <Link
                href="/logout"
                className="text-xs font-semibold px-3 py-1 rounded border border-red-500 text-red-300 hover:bg-red-500 hover:text-white transition-colors"
              >
                ログアウト
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* メインパネル */}
        <div className="bg-white rounded border border-gray-300 p-6 md:p-10 mb-8">
          <h1 className="text-2xl font-bold mb-2 pb-2 border-b border-gray-200 text-black">
            WalkFind
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            フォトコンテストに参加・投票・結果閲覧ができるサービスです
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 開催中コンテストへ - 青系のアクセント */}
            <Link
              href="/contests"
              className="group flex flex-col items-center justify-center p-6 rounded border border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition duration-200"
            >
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">📸</span>
              <h2 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 mb-2">
                開催中のコンテスト
              </h2>
              <p className="text-xs text-gray-500 text-center">
                現在参加できるフォトコンテスト一覧を見る
              </p>
              {/* ボタン風装飾 */}
              <div className="mt-4 px-4 py-1 bg-gray-200 text-xs font-bold text-gray-700 rounded-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                Active Contests
              </div>
            </Link>

            {/* 結果発表済みコンテストへ - 落ち着いたアクセント */}
            <Link
              href="/contests/announced"
              className="group flex flex-col items-center justify-center p-6 rounded border border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition duration-200"
            >
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">🏆</span>
              <h2 className="text-lg font-bold text-gray-800 group-hover:text-black mb-2">
                結果発表済み
              </h2>
              <p className="text-xs text-gray-500 text-center">
                過去に開催されたコンテストの結果を見る
              </p>
              {/* ボタン風装飾 */}
              <div className="mt-4 px-4 py-1 bg-gray-200 text-xs font-bold text-gray-700 rounded-sm group-hover:bg-gray-600 group-hover:text-white transition-colors">
                Past Contests
              </div>
            </Link>
          </div>

          {isLoggedIn && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/users/me"
                className="inline-flex items-center px-4 py-2 rounded border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
              >
                マイページへ
              </Link>
            </div>
          )}
        </div>
        
        {/* フッター風のコピーライトエリア */}
        <div className="text-center text-xs text-gray-400">
          &copy; WalkFind
        </div>
      </div>
    </main>
  );
}