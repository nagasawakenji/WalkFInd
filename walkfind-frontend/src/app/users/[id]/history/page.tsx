import { notFound } from "next/navigation";

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
};

type UserHistoryResponse = {
  contestResults: ContestResultDto[];
  recentPublicPosts: PhotoDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

async function fetchUserHistory(
  userId: string,
  page: number,
  size: number
): Promise<UserHistoryResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/users/${userId}/history?page=${page}&size=${size}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();
  return res.json();
}

export default async function UserHistoryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const userId = params.id;
  const page = Number(searchParams.page ?? 0);
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
              <img
                key={photo.photoId}
                src={photo.photoUrl}
                className="aspect-square object-cover rounded"
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== Pagination ===== */}
      <div className="flex justify-center gap-4">
        {page > 0 && (
          <a
            href={`/users/${userId}/history?page=${page - 1}`}
            className="px-4 py-2 border rounded"
          >
            ← 前へ
          </a>
        )}

        <span className="px-4 py-2 text-sm">
          {page + 1} / {history.totalPages}
        </span>

        {page + 1 < history.totalPages && (
          <a
            href={`/users/${userId}/history?page=${page + 1}`}
            className="px-4 py-2 border rounded"
          >
            次へ →
          </a>
        )}
      </div>
    </div>
  );
}