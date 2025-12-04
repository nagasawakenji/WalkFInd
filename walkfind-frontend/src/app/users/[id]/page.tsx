// app/users/[id]/page.tsx
import { notFound } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

// --- 型定義（バックエンドの DTO に合わせている想定） ---

type UserPublicProfileResponse = {
  userId: string;
  nickname: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  totalPosts: number;
  totalContestsEntered: number;
  bestRank: number; // 参加歴なしなら 0 とか
};

type ContestResultDto = {
  contestId: string;
  contestName: string;
  heldDate: string; // LocalDateTime が JSON になった文字列
  rank: number;
  totalParticipants: number;
  photoId: string;
};

type PhotoDto = {
  photoId: string;
  title: string;
  submissionDate: string; // LocalDateTime -> string
  totalVotes: number;
  // 必要なら contestId / contestName も追加
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
    throw new Error(`Failed to fetch profile: ${res.status}`);
  }

  return res.json();
}

async function fetchUserHistory(userId: string): Promise<UserHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/history`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    // ユーザー自体が存在しない場合は 404 を返す
    notFound();
  }

  if (!res.ok) {
    // 履歴 API が 500 などで落ちても、プロフィールページ自体は表示したいので
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
  params: Promise<{ id: string }>; // Next.js 15: params は Promise で渡ってくる
}

export default async function UserPage({ params }: PageProps) {
  const { id: userId } = await params; // /users/local-user → "local-user"

  const [profile, history] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserHistory(userId),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* ヘッダー / プロフィール情報 */}
      <section className="flex gap-4 items-center">
        <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {profile.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt={profile.nickname ?? "プロフィール画像"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl">
              {(profile.nickname ?? profile.userId)[0] ?? "U"}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold">
            {profile.nickname ?? "No nickname"}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            User ID: {profile.userId}
          </p>
          {profile.bio && (
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
              {profile.bio}
            </p>
          )}
        </div>
      </section>

      {/* サマリカード */}
      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-gray-500">総投稿数</p>
          <p className="mt-1 text-xl font-semibold">{profile.totalPosts}</p>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-gray-500">参加コンテスト数</p>
          <p className="mt-1 text-xl font-semibold">
            {profile.totalContestsEntered}
          </p>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-gray-500">自己ベスト順位</p>
          <p className="mt-1 text-xl font-semibold">
            {profile.bestRank > 0 ? `#${profile.bestRank}` : "-"}
          </p>
        </div>
      </section>

      {/* コンテスト成績 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">最近のコンテスト成績</h2>

        {history.contestResults.length === 0 ? (
          <p className="text-sm text-gray-500">
            コンテスト参加履歴はまだありません。
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">コンテスト</th>
                <th className="py-2 text-right">順位</th>
                <th className="py-2 text-right">参加者数</th>
                <th className="py-2 text-right">開催日</th>
              </tr>
            </thead>
            <tbody>
              {history.contestResults.map((result) => (
                <tr
                  key={`${result.contestId}-${result.photoId}`}
                  className="border-b last:border-0"
                >
                  <td className="py-2">{result.contestName}</td>
                  <td className="py-2 text-right">#{result.rank}</td>
                  <td className="py-2 text-right">
                    {result.totalParticipants}
                  </td>
                  <td className="py-2 text-right">
                    {new Date(result.heldDate).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 最近の投稿 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">最近の投稿</h2>

        {history.recentPublicPosts.length === 0 ? (
          <p className="text-sm text-gray-500">
            公開投稿はまだありません。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {history.recentPublicPosts.map((photo) => (
              <article
                key={photo.photoId}
                className="rounded-lg border overflow-hidden"
              >
                <div className="p-3">
                  <h3 className="font-medium">{photo.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(photo.submissionDate).toLocaleString("ja-JP")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    投票数: {photo.totalVotes}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}