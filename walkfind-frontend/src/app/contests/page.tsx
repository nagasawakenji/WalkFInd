// src/app/contests/page.tsx
export const dynamic = "force-dynamic";
import Link from 'next/link';
import { apiClient } from '@/lib/axios';
import { ContestResponse } from '@/types';
import ContestIcon from '@/components/ContestIcon';


interface ContestIconResponse {
  contestId: number;
  iconUrl: string | null;
  success: boolean;
  message?: string;
}

interface ContestIconListResponse {
  icons: ContestIconResponse[];
  totalCount: number;
}

// データの取得処理 (Server Component)
async function getContests(): Promise<ContestResponse[]> {
  try {
    // ① コンテスト一覧取得
    const contests: ContestResponse[] = await apiClient.get('/contests');

    if (!contests || contests.length === 0) {
      return [];
    }

    // ② contestId をまとめてクエリ文字列にする
    const idsParam = contests.map((c) => c.contestId).join(',');

    // ③ アイコン一覧取得
    let iconMap = new Map<number, string | null>();

    try {
      const iconList: ContestIconListResponse = await apiClient.get(
        `/contest-icons`,
        { params: { ids: idsParam } }
      );

      iconMap = new Map(
        iconList.icons.map((icon) => [icon.contestId, icon.iconUrl])
      );
    } catch (e) {
      console.error('Failed to fetch contest icons:', e);
    }

    // ④ アイコン URL を contests にマージ
    const merged = contests.map((c) => ({
      ...c,
      iconUrl: iconMap.get(c.contestId) ?? null,
    }));

    return merged;

  } catch (error) {
    console.error("Failed to fetch contests:", error);
    return [];
  }
}

export default async function HomePage() {
  const contests = await getContests();

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* AtCoder風 黒いナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-6 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300 transition">
          WalkFind
        </Link>
      </nav>

      <div className="container mx-auto px-4 pb-12">
        {/* メインコンテンツエリア */}
        <div className="bg-white rounded-sm border border-gray-300 p-6 md:p-8 shadow-sm">
          
          {/* 見出し */}
          <div className="border-b border-gray-200 mb-6 pb-2">
            <h1 className="text-2xl font-bold text-black">
              開催中のフォトコンテスト
            </h1>
          </div>

          {contests.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 border border-gray-200 rounded-sm text-gray-500">
              現在開催中のコンテストはありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contests.map((contest) => (
                <Link 
                  href={`/contests/${contest.contestId}`} 
                  key={contest.contestId}
                  className="block group"
                >
                  {/* カード */}
                  <div className="h-full bg-white border border-gray-300 rounded-sm transition duration-200 hover:border-blue-400 hover:bg-blue-50/10 flex flex-col overflow-hidden">
                    
                    <div className="relative h-64 bg-gray-100 border-b border-gray-200 group-hover:opacity-90">
                      {contest.iconUrl ? (
                        // 画像がある場合：imgタグで領域いっぱいに表示(object-cover)
                        <img 
                          src={contest.iconUrl} 
                          alt={contest.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        // 画像がない場合：以前と同様に中央揃えでプレースホルダーを表示（サイズを少し大きく調整）
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                          <ContestIcon iconUrl={null} size={100} />
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        {/* ステータスバッジ */}
                        <span className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded-sm">
                          {contest.status}
                        </span>
                        <span className="text-xs text-gray-500 font-mono mt-0.5">
                          End: {new Date(contest.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* タイトル */}
                      <h2 className="text-lg font-bold mb-2 text-blue-600 group-hover:underline decoration-blue-600 underline-offset-2 line-clamp-2">
                        {contest.name}
                      </h2>
                      
                      {/* テーマ */}
                      <div className="mt-auto pt-2 border-t border-dashed border-gray-200">
                        <p className="text-gray-600 text-sm line-clamp-2">
                          <span className="font-bold text-gray-400 text-xs mr-1">THEME:</span>
                          {contest.theme}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}