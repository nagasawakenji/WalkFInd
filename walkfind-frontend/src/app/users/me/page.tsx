'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { isAxiosError } from 'axios';

// env は文字列なので boolean にする
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

interface UserProfileResponse {
  userId: string;
  username: string;
  email: string;
  role: string;
  totalPhotos: number;
  totalVotesReceived: number;
  profileImageUrl?: string;
}

export default function MyPage() {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ★追加: 削除処理中のローディング状態
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      // (中略: 変更なし)
      try {
        const res = await api.get<UserProfileResponse>('/users/me');
        const userData = res.data;
        setProfile(userData);

        if (userData.profileImageUrl) {
          const originalUrl = userData.profileImageUrl;
          if (originalUrl.startsWith('http')) {
            setDisplayImageUrl(originalUrl);
          } else {
            if (IS_LOCAL) {
              const cleanKey = originalUrl.startsWith('/') ? originalUrl.slice(1) : originalUrl;
              const base = api.defaults.baseURL ?? '';
              setDisplayImageUrl(`${base}/local-storage/${cleanKey}`);
            } else {
              try {
                const presignRes = await api.get('/upload/presigned-download-url', {
                  params: { key: originalUrl },
                });
                setDisplayImageUrl(presignRes.data.photoUrl);
              } catch (err) {
                console.error('Failed to get presigned download url', err);
                setDisplayImageUrl(null);
              }
            }
          }
        } else {
          setDisplayImageUrl(null);
        }
      } catch (error: unknown) {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401) {
          localStorage.setItem('redirect_after_login', '/users/me');
          router.replace('/login');
          return;
        }
        console.error('Profile fetch error', error);
      } finally {
        setLoading(false);
      }
    };
    getProfile();
  }, [router]);

  // ★追加: 退会処理ハンドラー
  const handleDeleteAccount = async () => {
    if (!profile) return;

    const confirmed = window.confirm(
      "【警告】本当にアカウントを削除して退会しますか？\n\n" +
      "・ユーザー情報は匿名化されます（復元できません）。\n" +
      "・投稿した写真は削除されません。\n\n" +
      "よろしいですか？"
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // バックエンドの退会APIをコール
      await api.delete('/auth/me');

      alert("退会処理が完了しました。\nご利用ありがとうございました。");
      
      // CookieはAPIレスポンスで削除されますが、念のためフロント側でもリダイレクト
      router.push('/'); 
      router.refresh(); // ヘッダーの状態などを更新するため

    } catch (error) {
      console.error('Account deletion failed', error);
      alert("退会処理に失敗しました。時間をおいて再度お試しください。");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-black"></div>
             <p className="text-gray-400 font-mono text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* 共通ナビゲーションバー */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">My Page</span>
            </div>
            {IS_LOCAL && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">
                    DEV MODE
                </span>
            )}
        </div>
      </nav>

      <div className="pt-24 max-w-6xl mx-auto px-4">
        
        {/* ヘッダーエリア */}
        <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">
               Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
               あなたのプロフィール情報とアクティビティ状況です。
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左カラム: プロフィールカード */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center relative overflow-hidden">
               {/* ... (既存コード: プロフィール画像など) ... */}
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gray-50 to-white -z-10"></div>
              
              <div className="relative w-32 h-32 mx-auto bg-white rounded-full p-1 mb-4 shadow-md ring-1 ring-gray-100">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-100">
                    {displayImageUrl ? (
                    <Image
                        src={displayImageUrl}
                        alt={profile.username}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    ) : (
                    <div className="flex items-center justify-center h-full text-5xl text-gray-300 font-bold bg-gray-50">
                        {(profile.username || profile.userId)[0]?.toUpperCase()}
                    </div>
                    )}
                </div>
                {/* オンラインインジケーター */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              <h2 className="text-xl font-bold text-black break-words mb-1">
                {profile.username}
              </h2>
              <div className="text-xs text-gray-400 font-mono mb-6 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                @{profile.userId}
              </div>

              <div className="text-left space-y-4 border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase">Role</span>
                  <span className="text-xs font-bold text-white bg-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {profile.role}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Email</span>
                  <span className="text-sm text-gray-700 font-mono break-all block truncate" title={profile.email}>
                    {profile.email}
                  </span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3">
                <Link
                  href="/users/me/bio"
                  className="w-full py-2.5 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-lg hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                >
                  Edit Bio
                </Link>
                <Link
                  href="/users/me/image"
                  className="w-full py-2.5 bg-gray-50 border border-gray-200 text-sm font-bold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Change Avatar
                </Link>
              </div>
            </div>
          </div>

          {/* 右カラム: 統計・アクティビティ・Danger Zone */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 統計ウィジェット */}
            <div className="grid grid-cols-2 gap-4">
               {/* ... (既存コード: 統計情報) ... */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-4xl opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">📸</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Posts</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-black tracking-tight">{profile.totalPhotos}</span>
                  <span className="text-sm text-gray-500">shots</span>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-4xl opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">❤️</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Votes</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-black tracking-tight">{profile.totalVotesReceived}</span>
                  <span className="text-sm text-gray-500">received</span>
                </div>
              </div>
            </div>

            {/* アクティビティエリア */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 min-h-[320px] flex flex-col">
              {/* ... (既存コード: Recent Activity) ... */}
              <h3 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
                 Recent Activity
              </h3>

              <div className="flex-grow flex flex-col items-center justify-center text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                 <div className="text-4xl mb-3 text-gray-300">👋</div>
                 <p className="text-gray-900 font-bold mb-1">やあ, {profile.username}!</p>
                 <p className="text-gray-500 text-sm mb-6 max-w-sm">
                    新しいfindに参加して、あなたの発見を他の人にも教えてあげましょう!!
                 </p>
                 <Link 
                    href="/contests" 
                    className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                 >
                    Join a Contest &rarr;
                 </Link>
              </div>
            </div>

            {/* ★追加: Danger Zone (退会エリア) */}
            <div className="border border-red-100 rounded-2xl p-6 bg-red-50/30 mt-8">
              <h3 className="text-sm font-bold text-red-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                ⚠️ Danger Zone
              </h3>
              <p className="text-xs text-red-500 mb-4 leading-relaxed">
                アカウントを削除すると、プロフィール情報は復元できません。投稿した写真は残りますが、ユーザー名は匿名化されます。
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Processing...' : 'Delete Account'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}