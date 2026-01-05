// src/app/users/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// 環境変数設定
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// --- 型定義 ---
type UserPublicProfileResponse = {
  userId: string;
  nickname: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  totalPosts: number;
  totalContestsEntered: number;
  bestRank: number; 
};

type ContestResultDto = {
  contestId: string;
  contestName: string;
  heldDate: string;
  rank: number;
  totalParticipants: number;
  photoId: string;
};

type PhotoDto = {
  photoId: string;
  title: string;
  submissionDate: string;
  totalVotes: number;
  photoUrl: string;
};

type UserHistoryResponse = {
  contestResults: ContestResultDto[];
  recentPublicPosts: PhotoDto[];
};

type PresignedUrlResponse = {
  key: string;
  photoUrl: string;
};

// --- ヘルパー関数 ---
async function resolveProfileImageUrl(originalUrl: string | null): Promise<string | null> {
  if (!originalUrl) return null;
  if (originalUrl.startsWith("http")) return originalUrl;

  const cleanKey = originalUrl.startsWith("/") ? originalUrl.slice(1) : originalUrl;

  if (IS_LOCAL) {
    return `${API_BASE_URL}/local-storage/${cleanKey}`;
  }

  try {
    const params = new URLSearchParams({ key: cleanKey });
    const endpoint = `${API_BASE_URL}/upload/presigned-download-url?${params.toString()}`;
    const res = await fetch(endpoint, { cache: "no-store" });
    
    if (res.ok) {
      const data: PresignedUrlResponse = await res.json();
      return data.photoUrl; 
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchUserProfile(userId: string): Promise<UserPublicProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  return res.json();
}

async function fetchUserHistory(userId: string): Promise<UserHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/history`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) return { contestResults: [], recentPublicPosts: [] };
  return res.json();
}

// --- ページ本体 ---

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: PageProps) {
  const { id: userId } = await params;

  const [profile, history] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserHistory(userId),
  ]);

  const profileImageSrc = await resolveProfileImageUrl(profile.profileImageUrl);
  const initial = (profile.nickname ?? profile.userId)[0]?.toUpperCase() ?? "U";

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* 共通ナビゲーションバー (Fixed & H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">User Profile</span>
            </div>
            {IS_LOCAL && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">
                    DEV MODE
                </span>
            )}
        </div>
      </nav>

      <div className="pt-24 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左カラム：プロフィール情報 (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* プロフィールカード */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gray-50 to-white -z-10"></div>
              
              <div className="relative w-32 h-32 mx-auto bg-white rounded-full p-1 mb-4 shadow-md ring-1 ring-gray-100">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-100">
                    {profileImageSrc ? (
                      <Image
                        src={profileImageSrc}
                        alt={profile.nickname ?? "Profile"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-5xl text-gray-300 font-bold bg-gray-50">
                        {initial}
                      </div>
                    )}
                </div>
              </div>

              <h1 className="text-2xl font-extrabold text-black break-words mb-1 tracking-tight">
                {profile.nickname ?? "Unknown User"}
              </h1>
              <div className="text-xs text-gray-400 font-mono mb-6 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
                @{profile.userId}
              </div>

              {profile.bio && (
                <div className="text-sm text-gray-600 whitespace-pre-line border-t border-gray-100 pt-4 leading-relaxed">
                  {profile.bio}
                </div>
              )}
            </div>

            {/* 統計情報（モダンリスト） */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Stats & Achievements
                    </h3>
                </div>
                <div className="divide-y divide-gray-50">
                    <div className="p-5 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <span className="text-xl group-hover:scale-110 transition-transform">📸</span>
                            <span className="text-sm font-medium text-gray-600">Total Posts</span>
                        </div>
                        <span className="text-lg font-bold text-black">{profile.totalPosts}</span>
                    </div>
                    <div className="p-5 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <span className="text-xl group-hover:scale-110 transition-transform">🏅</span>
                            <span className="text-sm font-medium text-gray-600">Contests Joined</span>
                        </div>
                        <span className="text-lg font-bold text-black">{profile.totalContestsEntered}</span>
                    </div>
                    <div className="p-5 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
                            <span className="text-sm font-medium text-gray-600">Best Rank</span>
                        </div>
                        <span className={`text-lg font-bold ${profile.bestRank > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {profile.bestRank > 0 ? `#${profile.bestRank}` : "-"}
                        </span>
                    </div>
                </div>
            </div>
          </div>

          {/* 右カラム：メインコンテンツ (8/12) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* コンテスト成績 */}
            <section>
              <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                <span className="text-2xl">🏆</span> Contest History
              </h2>

              {history.contestResults.length === 0 ? (
                <div className="py-12 text-center bg-white border border-dashed border-gray-300 rounded-xl">
                  <p className="text-gray-500 font-medium">No contest history yet.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="py-4 px-6">Contest</th>
                          <th className="py-4 px-6 text-center">Rank</th>
                          <th className="py-4 px-6 text-right">Participants</th>
                          <th className="py-4 px-6 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {history.contestResults.map((result) => (
                          <tr
                            key={`${result.contestId}-${result.photoId}`}
                            className="hover:bg-blue-50/30 transition-colors group"
                          >
                            <td className="py-4 px-6 font-bold text-gray-900">
                              <Link href={`/contests/announced/${result.contestId}`} className="hover:text-blue-600 hover:underline transition-colors block truncate max-w-[200px] sm:max-w-xs">
                                {result.contestName}
                              </Link>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`
                                inline-flex items-center justify-center min-w-[3rem] py-1 rounded-full text-xs font-bold
                                ${result.rank === 1 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                                  result.rank <= 3 ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'text-gray-500 bg-gray-50'}
                              `}>
                                  {result.rank === 1 && '👑 '}#{result.rank}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right text-gray-600 font-mono">
                              {result.totalParticipants}
                            </td>
                            <td className="py-4 px-6 text-right text-gray-400 font-mono text-xs">
                              {new Date(result.heldDate).toLocaleDateString("ja-JP")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* 最近の投稿 */}
            <section>
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <span className="text-2xl">📸</span> Recent Posts
                  </h2>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Latest {history.recentPublicPosts.length} items
                  </span>
              </div>

              {history.recentPublicPosts.length === 0 ? (
                <div className="py-12 text-center bg-white border border-dashed border-gray-300 rounded-xl">
                  <p className="text-gray-500 font-medium">No public photos yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.recentPublicPosts.map((photo) => (
                    <div
                      key={photo.photoId}
                      className="group bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                        {photo.photoUrl ? (
                          <Image
                            src={photo.photoUrl}
                            alt={photo.title || "Photo"}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300 text-xs">No Image</div>
                        )}
                        
                        {/* Vote Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span>♥</span> {photo.totalVotes}
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-black transition-colors">
                            {photo.title}
                        </h3>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(photo.submissionDate).toLocaleDateString("ja-JP")}
                            </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}