'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

// Cognito Hosted UI のログアウトURL（環境変数から取得）
const COGNITO_LOGOUT_URL = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URL;

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

        // 3. Cognito Hosted UI のセッションも削除するため、ログアウトURLにリダイレクト
        if (!COGNITO_LOGOUT_URL) {
          console.error('[LogoutPage] COGNITO_LOGOUT_URL is not defined.');
          router.push('/');
          return;
        }

        // Next.js のルーターではなく、ブラウザリダイレクトで飛ばす
        window.location.href = COGNITO_LOGOUT_URL;
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
