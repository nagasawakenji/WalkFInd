'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

// Cognito Hosted UI のログアウトURL（環境変数から取得）
const COGNITO_LOGOUT_URL = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URL;

// API Base URL (should include `/api/v1`)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

// Best-effort client-side cookie deletion (works only for non-HttpOnly cookies)
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  // Try common combinations
  document.cookie = `${name}=; Max-Age=0; path=/`;
  document.cookie = `${name}=; Max-Age=0; path=/; Secure; SameSite=None`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=None`;
}

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const doLogout = async () => {
      try {
        // Amplify / フロント側の認証情報を削除
        try {
          await signOut();
        } catch (e) {
          console.warn('[LogoutPage] Amplify signOut failed (or not configured):', e);
        }

        // 古い実装の名残。残っていても害はない
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('access_token');
          window.localStorage.removeItem('id_token');
          window.localStorage.removeItem('access_ttl');
          window.localStorage.removeItem('user_id');
        }

        // Cookie ベースのセッションを無効化（HttpOnly cookie はサーバ側で失効が必要）
        try {
          // Expect backend to clear cookies via Set-Cookie (Max-Age=0 / Expires)
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } catch (e) {
          console.warn('[LogoutPage] backend logout failed:', e);
        }

        // HttpOnly cookie の場合はブラウザ側でも念のため削除
        if (typeof window !== 'undefined') {
          deleteCookie('access_token');
          deleteCookie('refresh_token');
          deleteCookie('id_token');
          deleteCookie('access_ttl');
          deleteCookie('user_id');
        }

        // Cognito Hosted UI のセッションも削除するため、ログアウトURLにリダイレクト
        if (!COGNITO_LOGOUT_URL) {
          console.warn('[LogoutPage] COGNITO_LOGOUT_URL is not defined. Redirecting to /.');
          router.replace('/');
          router.refresh();
          return;
        }

        // のルーターではなく、ブラウザリダイレクトで飛ばす
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
