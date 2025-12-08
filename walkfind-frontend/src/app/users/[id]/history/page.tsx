import { notFound } from "next/navigation";

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
// 末尾に /api/v1 を含んでいるため、呼び出し側では /users/... のように続けます
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

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
  photoUrl: string;
  description: string;
  postDate: string;
  likesCount: number;
  private: boolean;
};

type UserHistoryResponse = {
  contestResults: ContestResultDto[];
  recentPublicPosts: PhotoDto[];
};

async function fetchUserHistory(
  userId: string,
  page: number,
  size: number
): Promise<UserHistoryResponse> {
  // 修正: 複雑なbaseUrl計算をやめ、定義した定数 API_BASE_URL を使用します
  console.log("[fetchUserHistory] API_BASE_URL =", API_BASE_URL);

  const res = await fetch(
    // API_BASE_URL が既に /api/v1 を含んでいるため、/users/... から記述します
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}/history?page=${page}&size=${size}`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.error("Failed to fetch user history:", res.status);
    return {
      contestResults: [],
      recentPublicPosts: [],
    } as UserHistoryResponse;
  }
  return res.json();
}

export default async function UserHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id: userId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 0);
  const size = 10;

  const history = await fetchUserHistory(userId, page, size);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">

      {/* ===== Header ===== */}
      <h1 className="text-2xl font-bold">ユーザー活動履歴</h1>

      {/* ===== Contest Results ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4">コンテスト成績</h2>

        {history.contestResults.length === 0 ? (
          <p className="text-gray-500">参加実績なし</p>
        ) : (
          <div className="space-y-3">
            {history.contestResults.map((r) => (
              <div key={r.contestId} className="border rounded p-4 flex justify-between">
                <div>
                  <div className="font-semibold">{r.contestName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(r.heldDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold">{r.rank} 位</div>
                  <div className="text-sm text-gray-400">
                    / {r.totalParticipants} 人
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Recent Photos ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4">最近の投稿</h2>

        {history.recentPublicPosts.length === 0 ? (
          <p className="text-gray-500">投稿なし</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {history.recentPublicPosts.map((photo) => (
              <div key={photo.photoId} className="rounded border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photoUrl}
                  alt={photo.description}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-2 text-xs text-gray-600">
                  <div className="truncate">{photo.description}</div>
                  <div>{new Date(photo.postDate).toLocaleString("ja-JP")}</div>
                  <div>いいね: {photo.likesCount}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}