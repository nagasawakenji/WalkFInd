'use client';

import Link from 'next/link';

// ★ 本番・ローカルのデフォルトURL（必要なら書き換え）
const DEFAULT_COGNITO_LOGIN_URL_PROD =
  'https://ap-northeast-1lvczdifp6.auth.ap-northeast-1.amazoncognito.com/login?client_id=uut2o2ikg67fvhvll2ae3268o&response_type=code&scope=email+openid+phone&redirect_uri=https%3A%2F%2Fwalkfind.vercel.app%2Fauth%2Fcallback';

const DEFAULT_COGNITO_LOGIN_URL_DEV =
  'https://walkfind-auth.auth.ap-northeast-1.amazoncognito.com/login?client_id=3n38j4erbgfcanu6v9n87he38r&response_type=code&scope=email+openid+phone&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback';

// ★ env → なければ NODE_ENV でデフォルト
const COGNITO_LOGIN_URL =
  process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_COGNITO_LOGIN_URL_PROD
    : DEFAULT_COGNITO_LOGIN_URL_DEV);

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333] flex flex-col">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 shadow-sm">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight hover:text-gray-300"
        >
          WalkFind
        </Link>
      </nav>

      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-300 rounded-sm p-8 shadow-sm text-center">
          <div className="mb-6">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-black">Sign In</h1>
          <p className="text-sm text-gray-500 mb-8 font-mono">
            Please authenticate to continue.
          </p>

          <p className="mb-4 text-xs break-all text-gray-400">
            DEBUG URL: {COGNITO_LOGIN_URL || '(empty)'}
          </p>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            onClick={() => {
              console.log(
                '[LoginPage] Using COGNITO_LOGIN_URL:',
                COGNITO_LOGIN_URL
              );

              if (COGNITO_LOGIN_URL) {
                window.location.href = COGNITO_LOGIN_URL;
              } else {
                console.error('Cognito Login URL is not defined.');
                alert('Login configuration error.');
              }
            }}
          >
            <span>Sign in with Cognito</span>
            <span className="text-lg">→</span>
          </button>

          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
            &copy; WalkFind System
          </div>
        </div>
      </div>
    </main>
  );
}