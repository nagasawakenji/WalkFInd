'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type UserRole = 'ADMIN' | 'USER' | string;

type UsersMeResponse = {
  role?: UserRole;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractRole(value: unknown): UserRole | undefined {
  if (!isRecord(value)) return undefined;

  // 1) { role: "ADMIN" }
  const direct = value['role'];
  if (typeof direct === 'string') return direct as UserRole;

  // 2) { user: { role: "ADMIN" } }
  const user = value['user'];
  if (isRecord(user)) {
    const nested = user['role'];
    if (typeof nested === 'string') return nested as UserRole;
  }

  // 3) { profile: { role: "ADMIN" } }
  const profile = value['profile'];
  if (isRecord(profile)) {
    const nested = profile['role'];
    if (typeof nested === 'string') return nested as UserRole;
  }

  return undefined;
}

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const lastCheckedAtRef = useRef<number>(0);
  useEffect(() => {

    const checkAuth = async () => {
      // 多重実行ガード（短時間に連続で叩かない）
      const now = Date.now();
      if (now - lastCheckedAtRef.current < 800) return;
      lastCheckedAtRef.current = now;

      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        setIsLoggedIn(res.ok);

        // 可能なら role を読み取って admin 判定（レスポンス形式が違っても落ちないように安全側）
        if (res.ok) {
          try {
            const contentType = res.headers.get('content-type') ?? '';
            const raw = await res.text();

            // デバッグ: 実際の /users/me の返却を確認（本番では消してOK）
            console.log('/users/me status=', res.status, 'content-type=', contentType);
            console.log('/users/me body=', raw);

            let data: unknown = undefined;
            if (raw) {
              try {
                data = JSON.parse(raw) as unknown;
              } catch {
                data = undefined;
              }
            }

            const role = extractRole(data);
            console.log('role is', role);
            setIsAdmin(role === 'ADMIN');
          } catch {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        console.warn('auth check failed on HomePage:', e);
        setIsLoggedIn(false);
        setIsAdmin(false);
      } finally {
        setAuthChecked(true);
      }
    };

    // 初回
    checkAuth();

    // フォーカス復帰で状態更新（Cookie更新/期限切れに追従）
    const onFocus = () => checkAuth();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg tracking-tight">WalkFind</span>

          {/* 未ログイン時: ログインボタン */}
          {authChecked && !isLoggedIn && (
            <a
              href={COGNITO_LOGIN_URL ?? '/login'}
              onClick={(e) => {
                if (typeof window === 'undefined') return;

                const currentPath = window.location.pathname + window.location.search;
                window.localStorage.setItem('redirect_after_login', currentPath);

                if (!COGNITO_LOGIN_URL) {
                  e.preventDefault();
                  router.push('/login');
                  return;
                }

                // Cognito Hosted UIへ確実に遷移（SPA遷移ではなくフルリダイレクト）
                e.preventDefault();
                window.location.href = COGNITO_LOGIN_URL;
              }}
              className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
            >
              ログイン
            </a>
          )}

          {/* ログイン時: マイページ & ログアウトボタン */}
          {authChecked && isLoggedIn && (
            <>
              <Link
                href="/users/me"
                className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
              >
                マイページ
              </Link>

              {/* ログイン後: コンテスト作成 & 管理（admin/ユーザーで遷移先を分岐） */}
              <Link
                href="/contests/create"
                className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
              >
                コンテスト作成
              </Link>

              {!isAdmin && (
                <Link
                  href="/modify"
                  className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
                >
                  コンテスト管理
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin/modify"
                  className="text-xs font-semibold px-3 py-1 rounded border border-gray-500 hover:bg-white hover:text-black transition-colors"
                >
                  管理者管理
                </Link>
              )}

              <Link
                href="/"
                onClick={async (e) => {
                  e.preventDefault();

                  try {
                    // Amplify側（使っていれば）
                    await signOut();
                  } catch (err) {
                    console.warn('signOut failed:', err);
                  }

                  // サーバ側Cookieを消す（実装していれば）
                  try {
                    await fetch(`${API_BASE_URL}/auth/logout`, {
                      method: 'POST',
                      credentials: 'include',
                    });
                  } catch (err) {
                    // logout APIが無い/落ちていてもUIは先に戻す
                    console.warn('backend logout failed:', err);
                  }

                  setIsLoggedIn(false);
                  setIsAdmin(false);
                  router.push('/');
                }}
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

          {authChecked && isLoggedIn && (
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