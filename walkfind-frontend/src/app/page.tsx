'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';

const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type UserRole = 'ADMIN' | 'USER' | string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractRole(value: unknown): UserRole | undefined {
  if (!isRecord(value)) return undefined;
  const direct = value['role'];
  if (typeof direct === 'string') return direct as UserRole;
  const user = value['user'];
  if (isRecord(user)) {
    const nested = user['role'];
    if (typeof nested === 'string') return nested as UserRole;
  }
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

  // --- Auth Check Logic (変更なし) ---
  useEffect(() => {
    const checkAuth = async () => {
      const now = Date.now();
      if (now - lastCheckedAtRef.current < 800) return;
      lastCheckedAtRef.current = now;

      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        setIsLoggedIn(res.ok);

        if (res.ok) {
          try {
            const raw = await res.text();
            let data: unknown = undefined;
            if (raw) {
              try { data = JSON.parse(raw); } catch { data = undefined; }
            }
            const role = extractRole(data);
            setIsAdmin(role === 'ADMIN');
          } catch { setIsAdmin(false); }
        } else { setIsAdmin(false); }
      } catch (e) {
        setIsLoggedIn(false);
        setIsAdmin(false);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
    const onFocus = () => checkAuth();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // --- Handlers ---
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try { await signOut(); } catch (err) { console.warn(err); }
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) { console.warn(err); }
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push('/');
  };

  const handleLogin = (e: React.MouseEvent) => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    window.localStorage.setItem('redirect_after_login', currentPath);

    if (!COGNITO_LOGIN_URL) {
      e.preventDefault();
      router.push('/login');
      return;
    }
    e.preventDefault();
    window.location.href = COGNITO_LOGIN_URL;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* --- Navbar (Simple) --- */}
      <nav className="fixed top-0 w-full z-50 bg-white border-b border-gray-200 h-16">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-black">WalkFind</span>
          </div>

          <div className="flex items-center gap-4">
            {authChecked ? (
              isLoggedIn ? (
                <>
                  <Link href="/users/me" className="text-sm font-medium text-gray-600 hover:text-black transition">
                    マイページ
                  </Link>
                  {/* Navbarにもログアウトは残しておく（利便性のため） */}
                  <button
                    onClick={handleLogout}
                    className="text-xs font-bold px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <a
                  href={COGNITO_LOGIN_URL ?? '/login'}
                  onClick={handleLogin}
                  className="text-sm font-bold px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                  ログイン
                </a>
              )
            ) : (
               <div className="w-16 h-8 bg-gray-100 rounded animate-pulse"></div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 px-4 pb-20">
        
        {/* --- Hero / Welcome Section --- */}
        <section className="max-w-4xl mx-auto text-center mb-12">
           <h1 className="text-4xl font-extrabold text-black mb-4 tracking-tight">
              WalkFind
           </h1>
           <p className="text-lg text-gray-500 max-w-xl mx-auto">
              見つけましょう
           </p>
        </section>

        <section className="max-w-5xl mx-auto">
           {/* --- Login User Dashboard (Action Grid) --- */}
           {authChecked && isLoggedIn && (
             <div className="mb-12">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* コンテスト作成 */}
                    <Link 
                        href="/contests/create"
                        className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-black transition-all group"
                    >
                        <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">✨</span>
                        <span className="font-bold text-sm">コンテスト作成</span>
                    </Link>

                    {/* コンテスト管理 (Roleで分岐) */}
                    <Link 
                        href={isAdmin ? "/admin/modify" : "/modify"}
                        className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-black transition-all group"
                    >
                        <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚙️</span>
                        <span className="font-bold text-sm">{isAdmin ? "管理者設定" : "コンテスト管理"}</span>
                    </Link>

                    

                   
                </div>
             </div>
           )}

           {/* --- Main Content Grid --- */}
           <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              {isLoggedIn ? "Explore" : "Get Started"}
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Active Contests */}
              <Link href="/contests" className="block p-8 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="p-2 bg-blue-100 text-blue-600 rounded-lg text-xl">📸</span>
                    <h3 className="text-xl font-bold text-gray-900">開催中のコンテスト</h3>
                 </div>
                 <p className="text-gray-500 text-sm mb-6">
                    現在開催中のfind。外に出て見つけにいきましょう!!
                 </p>
                 <div className="text-sm font-bold text-blue-600 group-hover:underline">
                    一覧を見る &rarr;
                 </div>
              </Link>

              {/* Past Results */}
              <Link href="/contests/announced" className="block p-8 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-lg transition-all group">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="p-2 bg-gray-100 text-gray-600 rounded-lg text-xl">🏆</span>
                    <h3 className="text-xl font-bold text-gray-900">結果発表済み</h3>
                 </div>
                 <p className="text-gray-500 text-sm mb-6">
                    過去のfindです。何が見つかったのかをみてみましょう!!
                 </p>
                 <div className="text-sm font-bold text-gray-900 group-hover:underline">
                    結果を見る &rarr;
                 </div>
              </Link>
           </div>

           {/* --- Sign Up Call to Action (未ログイン時のみ) --- */}
           {authChecked && !isLoggedIn && (
               <div className="mt-12 text-center p-8 bg-gray-100 rounded-xl border border-gray-200">
                   <h3 className="text-lg font-bold mb-2">まだアカウントをお持ちではありませんか？</h3>
                   <p className="text-gray-500 text-sm mb-6">コンテストへの投稿や投票にはアカウントが必要です。</p>
                   
                   <a 
                      href={COGNITO_LOGIN_URL ?? '/login'}
                      onClick={handleLogin}
                      className="inline-block px-8 py-3 bg-black text-white font-bold rounded hover:bg-gray-800 transition"
                   >
                      アカウント作成 / ログイン
                   </a>
               </div>
           )}
        </section>

        {/* --- Footer --- */}
        <footer className="mt-20 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} WalkFind.
        </footer>

      </main>
    </div>
  );
}