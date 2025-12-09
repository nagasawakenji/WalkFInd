'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface UserProfileResponse {
  userId: string;
  username: string;
  email: string;
  role: string;
  totalPhotos: number;
  totalVotesReceived: number;
  // プロフィール画像などがAPIにある場合はここに追加
  profileImageUrl?: string; 
}

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

export default function MyPage() {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          router.push('/');
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);

      } catch (error) {
        console.error('Profile fetch error', error);
        // エラー時はログインへリダイレクトするなど適宜調整
        // router.push('/login'); 
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

  // プロフィール画像URLが「キー」の場合は /api/v1/local-storage/{key} として扱う
  const profileImageSrc =
    profile.profileImageUrl &&
    (profile.profileImageUrl.startsWith('http')
      ? profile.profileImageUrl
      : `${API_BASE_URL}/local-storage/${
          profile.profileImageUrl.startsWith('/')
            ? profile.profileImageUrl.slice(1)
            : profile.profileImageUrl
        }`);

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white font-medium">My Page</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左カラム：プロフィールカード */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-300 rounded-sm p-6 shadow-sm text-center">
              {/* アイコンエリア */}
              <div className="relative w-32 h-32 mx-auto bg-gray-100 rounded-sm overflow-hidden mb-4 border border-gray-200">
                {profileImageSrc ? (
                  <Image
                    src={profileImageSrc}
                    alt={profile.username}
                    fill
                    className="object-cover"
                    unoptimized
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