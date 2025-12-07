'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

// Cognito の設定（ログイン URL と同じドメイン / client_id を利用）
const COGNITO_DOMAIN = 'https://walkfind-auth.auth.ap-northeast-1.amazoncognito.com';
const CLIENT_ID = '3n38j4erbgfcanu6v9n87he38r';
// ログアウト後に戻ってくるURL（Cognitoのアプリ設定で "Sign-out URL(s)" に登録しておく）
const LOGOUT_REDIRECT_URL = 'http://localhost:3000/';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const doLogout = async () => {
      try {
        // 1. Amplify / フロント側の認証情報を削除
        try {
          await signOut();
        } catch (e) {
          console.warn('[LogoutPage] Amplify signOut failed (or not configured):', e);
        }

        // 2. 自前で持っているトークンも削除
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('access_token');
          window.localStorage.removeItem('id_token');
          window.localStorage.removeItem('access_ttl');
          window.localStorage.removeItem('user_id');
        }

        // 3. Cognito Hosted UI のセッションも削除するため、/logout にリダイレクト
        const url = new URL(`${COGNITO_DOMAIN}/logout`);
        url.searchParams.set('client_id', CLIENT_ID);
        url.searchParams.set('logout_uri', LOGOUT_REDIRECT_URL);

        // Next.js のルーターではなく、ブラウザリダイレクトで飛ばす
        window.location.href = url.toString();
      } catch (e) {
        console.error('[LogoutPage] unexpected error during logout:', e);
        // 何かあってもとりあえずトップに戻す
        router.push('/');
      }
    };

    doLogout();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">ログアウトしています...</p>
        <p className="text-sm text-gray-500">
          しばらくしても画面が切り替わらない場合は、ブラウザを再読み込みしてください。
        </p>
      </div>
    </main>
  );
}
