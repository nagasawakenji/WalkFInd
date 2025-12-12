'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchAuthSession } from 'aws-amplify/auth';

// 環境変数
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  // 表示用に解決された画像URLを保持するState
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      try {
        // 1. トークン取得 (Amplify -> LocalStorage フォールバック)
        let token: string | null = null;
        try {
          const session = await fetchAuthSession();
          token = session.tokens?.idToken?.toString() ?? null;
        } catch (e) {
          console.warn('fetchAuthSession failed, fallback to localStorage', e);
        }

        if (!token && typeof window !== 'undefined') {
          token = window.localStorage.getItem('access_token');
        }

        if (!token) {
          router.push('/');
          return;
        }

        // 2. プロフィール情報取得
        const res = await axios.get<UserProfileResponse>(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = res.data;
        setProfile(userData);

        // 3. プロフィール画像URLの解決 (S3対応)
        if (userData.profileImageUrl) {
          const originalUrl = userData.profileImageUrl;

          // すでに http(s) から始まる完全なURLならそのまま使う
          if (originalUrl.startsWith('http')) {
            setDisplayImageUrl(originalUrl);
          } else {
            // キー("profile-images/xxx.jpg")の状態の場合
            if (IS_LOCAL) {
              // --- ローカル環境: ローカルストレージAPIへ ---
              // キーの先頭にスラッシュがある場合のケア
              const cleanKey = originalUrl.startsWith('/') ? originalUrl.slice(1) : originalUrl;
              setDisplayImageUrl(`${API_BASE_URL}/local-storage/${cleanKey}`);
            } else {
              // --- 本番環境 (S3): Presigned URLを取得 ---
              try {
                // ダウンロード用URLを取得するAPIを叩く
                // (バックエンドに GET /api/v1/upload/presigned-download-url?key=... が必要です)
                const presignRes = await axios.get(`${API_BASE_URL}/upload/presigned-download-url`, {
                  params: { key: originalUrl },
                  headers: { Authorization: `Bearer ${token}` }
                });
                setDisplayImageUrl(presignRes.data.photoUrl);
              } catch (err) {
                console.error('Failed to get presigned download url', err);
                // 取得失敗時はキーをそのまま入れておく（表示は壊れるがデバッグ用）
                setDisplayImageUrl(null);
              }
            }
          }
        }

      } catch (error) {
        console.error('Profile fetch error', error);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white font-medium">My Page</span>
        {IS_LOCAL && <span className="ml-4 text-xs bg-blue-600 px-2 py-0.5 rounded">LOCAL MODE</span>}
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左カラム：プロフィールカード */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-300 rounded-sm p-6 shadow-sm text-center">
              {/* アイコンエリア */}
              <div className="relative w-32 h-32 mx-auto bg-gray-100 rounded-sm overflow-hidden mb-4 border border-gray-200">
                {displayImageUrl ? (
                  <Image
                    src={displayImageUrl}
                    alt={profile.username}
                    fill
                    className="object-cover"
                    unoptimized // S3などの外部URLを表示する場合に推奨
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl text-gray-300 font-bold bg-gray-100">
                    {(profile.username || profile.userId)[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <h1 className="text-xl font-bold text-black break-words mb-1">
                {profile.username}
              </h1>
              <p className="text-sm text-gray-500 font-mono mb-4 bg-gray-50 inline-block px-2 py-0.5 rounded-sm border border-gray-200">
                @{profile.userId}
              </p>
              
              <div className="border-t border-gray-100 pt-4 text-left space-y-3">
                 <div>
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Role</span>
                    <span className="text-xs font-bold text-white bg-gray-600 px-2 py-1 rounded-sm uppercase">
                      {profile.role}
                    </span>
                 </div>
                 <div>
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Email</span>
                    <span className="text-sm text-gray-700 font-mono break-all">
                      {profile.email}
                    </span>
                 </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                <Link
                  href="/users/me/bio"
                  className="block w-full text-center py-2 bg-white border border-gray-300 text-sm font-bold text-gray-700 rounded-sm hover:bg-gray-50 hover:text-black transition-colors"
                >
                  自己紹介文を編集
                </Link>
                <Link
                  href="/users/me/image"
                  className="block w-full text-center py-2 bg-white border border-gray-300 text-sm font-bold text-gray-700 rounded-sm hover:bg-gray-50 hover:text-black transition-colors"
                >
                  プロフィール画像を変更
                </Link>
              </div>
            </div>
          </div>

          {/* 右カラム：統計・アクティビティ */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 統計ダッシュボード */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-300 rounded-sm p-5 shadow-sm hover:border-blue-400 transition-colors">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Total Posts</div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-black">{profile.totalPhotos}</span>
                  <span className="text-sm text-gray-400 mb-1">shots</span>
                </div>
              </div>
              <div className="bg-white border border-gray-300 rounded-sm p-5 shadow-sm hover:border-pink-400 transition-colors">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Total Votes Received</div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-black">{profile.totalVotesReceived}</span>
                  <span className="text-sm text-gray-400 mb-1">votes</span>
                </div>
              </div>
            </div>

            {/* コンテンツエリア（プレースホルダー） */}
            <div className="bg-white border border-gray-300 rounded-sm shadow-sm p-6 min-h-[300px]">
              <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <span className="text-xl">⚙️</span> Dashboard
              </h2>
              
              <div className="text-center py-12 text-gray-400">
                 <p className="mb-2">Your recent activity will appear here.</p>
                 <Link href="/contests" className="text-blue-600 hover:underline text-sm font-bold">
                   Join a Contest &rarr;
                 </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}