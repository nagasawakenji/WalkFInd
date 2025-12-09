import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

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

// --- API 呼び出し ---

async function fetchUserProfile(
  userId: string
): Promise<UserPublicProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    const errorText = await res.text(); // バックエンドのエラーメッセージを取得
    console.error(`Backend Error (${res.status}):`, errorText); // Vercelのログに出る
    throw new Error(`Failed to fetch profile: ${res.status} - ${errorText}`);
  }

  return res.json();
}

async function fetchUserHistory(userId: string): Promise<UserHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/history`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    console.error("Failed to fetch history, fallback to empty:", res.status);
    return {
      contestResults: [],
      recentPublicPosts: [],
    };
  }

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

  // プロフィール画像URLがキーの場合は /api/v1/local-storage/{key} として扱う
  const profileImageSrc =
    profile.profileImageUrl &&
    (profile.profileImageUrl.startsWith("http")
      ? profile.profileImageUrl
      : `${API_BASE_URL}/local-storage/${
          profile.profileImageUrl.startsWith("/")
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
        <span className="text-sm text-white font-medium">Users</span>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-gray-300">{profile.userId}</span>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* 左カラム：プロフィール情報 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-300 rounded-sm p-6 shadow-sm text-center lg:text-left">
              <div className="relative w-32 h-32 mx-auto lg:mx-0 bg-gray-200 rounded-sm overflow-hidden mb-4 border border-gray-300">
                {profileImageSrc ? (
                  <Image
                    src={profileImageSrc}
                    alt={profile.nickname ?? "Profile"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl text-gray-400 font-bold bg-gray-100">
                    {(profile.nickname ?? profile.userId)[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>

              <h1 className="text-xl font-bold text-black break-words">
                {profile.nickname ?? "No nickname"}
              </h1>
              <p className="text-sm text-gray-500 font-mono mb-4 break-all">
                @{profile.userId}
              </p>

              {profile.bio && (
                <div className="text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-3">
                  {profile.bio}
                </div>
              )}
            </div>

            {/* サマリカード（モバイルでは下に、PCでは左サイドバーの下に配置） */}
            <div className="bg-white border border-gray-300 rounded-sm shadow-sm overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                    Statistics
                </div>
                <div className="divide-y divide-gray-100">
                    <div className="p-4 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Posts</span>
                        <span className="text-lg font-bold text-black">{profile.totalPosts}</span>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Contests</span>
                        <span className="text-lg font-bold text-black">{profile.totalContestsEntered}</span>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Best Rank</span>
                        <span className="text-lg font-bold text-blue-600">
                            {profile.bestRank > 0 ? `#${profile.bestRank}` : "-"}
                        </span>
                    </div>
                </div>
            </div>
          </div>

          {/* 右カラム：メインコンテンツ */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* コンテスト成績 */}
            <section className="bg-white border border-gray-300 rounded-sm shadow-sm p-6">
              <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <span className="text-xl">🏆</span> Contest History
              </h2>

              {history.contestResults.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 border border-dashed border-gray-200 rounded-sm">
                  コンテスト参加履歴はまだありません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 border-b border-gray-300">
                        <th className="py-2 px-4 text-left font-bold">Contest Name</th>
                        <th className="py-2 px-4 text-center font-bold">Rank</th>
                        <th className="py-2 px-4 text-right font-bold">Participants</th>
                        <th className="py-2 px-4 text-right font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.contestResults.map((result, idx) => (
                        <tr
                          key={`${result.contestId}-${result.photoId}`}
                          className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                        >
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {result.contestName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block w-12 py-0.5 rounded-sm font-bold text-xs ${
                                result.rank === 1 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                                result.rank <= 3 ? 'bg-gray-200 text-gray-700' : 'text-gray-600'
                            }`}>
                                #{result.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 font-mono">
                            {result.totalParticipants}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500 font-mono">
                            {new Date(result.heldDate).toLocaleDateString("ja-JP")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 最近の投稿 */}
            <section>
              <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <span className="text-xl">📸</span> Recent Posts
              </h2>

              {history.recentPublicPosts.length === 0 ? (
                <div className="bg-white border border-gray-300 rounded-sm p-8 text-center text-gray-500">
                  公開投稿はまだありません。
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.recentPublicPosts.map((photo) => (
                    <div
                      key={photo.photoId}
                      className="bg-white border border-gray-300 rounded-sm hover:shadow-md transition-all duration-200 group flex flex-col"
                    >
                      <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden border-b border-gray-200">
                        {photo.photoUrl ? (
                          <Image
                            src={photo.photoUrl}
                            alt={photo.title || "User submitted photo"}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                        )}
                        <div className="absolute top-0 right-0 bg-black/60 text-white text-xs px-2 py-1 font-mono">
                            ♥ {photo.totalVotes}
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-grow">
                        <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {photo.title}
                        </h3>
                        <p className="mt-auto text-xs text-gray-500 font-mono text-right">
                          {new Date(photo.submissionDate).toLocaleDateString("ja-JP")}
                        </p>
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