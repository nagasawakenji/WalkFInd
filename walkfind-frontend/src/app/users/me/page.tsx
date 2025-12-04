'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

interface UserProfileResponse {
  userId: string;
  username: string;
  email: string;
  role: string;
  totalPhotos: number; // 累計投稿数
  totalVotesReceived: number; // 累計獲得票数
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function MyPage() {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          // 未ログインならトップへ（あるいはログイン画面へ）
          router.push('/');
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(res.data);

      } catch (error) {
        console.error('Profile fetch error', error);
        alert('プロフィールの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [router]);

  if (loading) return <div className="text-center py-20">読み込み中...</div>;
  if (!profile) return null;

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-blue-600 h-32 w-full"></div>
        
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 text-center">
            {/* アイコン（仮） */}
            <div className="inline-block h-32 w-32 rounded-full bg-white p-2 shadow-lg">
              <div className="h-full w-full rounded-full bg-gray-300 flex items-center justify-center text-4xl">
                👤
              </div>
            </div>
            <h1 className="text-3xl font-bold mt-4">{profile.username}</h1>
            <p className="text-gray-500">@{profile.userId.substring(0, 8)}...</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center mb-8 border-t border-b py-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">{profile.totalPhotos}</div>
              <div className="text-gray-500 text-sm">投稿数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-pink-600">{profile.totalVotesReceived}</div>
              <div className="text-gray-500 text-sm">獲得票数</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold border-b pb-2">登録情報</h2>
            <div>
              <span className="text-gray-500 block text-sm">メールアドレス</span>
              <span className="font-medium">{profile.email}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-sm">権限ロール</span>
              <span className="font-medium uppercase">{profile.role}</span>
            </div>
          </div>

          {/* ここに「過去の投稿履歴」などを追加するとさらにリッチになります */}
        </div>
      </div>
    </main>
  );
}