// src/app/contests/page.tsx
export const dynamic = "force-dynamic"; // これがあるのでAxiosでもキャッシュされず毎回実行されます

import Link from 'next/link';
import { api } from '@/lib/api'; 
import { ContestDetailResponse } from '@/types';

// ----------------------
// 型定義の拡張
// ----------------------

// 元の型に iconUrl を追加した新しい型を定義
type ContestWithIcon = ContestDetailResponse & {
  iconUrl: string | null;
};

// アイコン取得APIのレスポンス型
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

// APIのレスポンスが「配列」か「オブジェクト内配列」か不明な場合の型
type ContestApiResponse = ContestDetailResponse[] | { contests: ContestDetailResponse[] };


// ----------------------
// データ取得ロジック (Server Side)
// ----------------------
// 戻り値の型を ContestWithIcon[] に変更
async function getContestsWithIcons(): Promise<ContestWithIcon[]> {
  try {
    // ① コンテスト一覧取得
    // ★修正1: { cache: "no-store" } を削除 (Axiosには存在しないため)
    const res = await api.get<ContestApiResponse>('/contests');
    
    // ★修正2: anyを使わずに型チェックで分岐、または安全に取り出す
    let contests: ContestDetailResponse[] = [];
    
    if (Array.isArray(res.data)) {
      contests = res.data;
    } else if ('contests' in res.data && Array.isArray(res.data.contests)) {
      contests = res.data.contests;
    }

    if (!contests || contests.length === 0) {
      return [];
    }

    // ② contestId をまとめてクエリ文字列にする
    const idsParam = contests.map((c) => c.contestId).join(',');

    // ③ アイコン一覧取得
    let iconMap = new Map<number, string | null>();

    if (idsParam) {
      try {
        const iconRes = await api.get<ContestIconListResponse>(
          '/contest-icons',
          { params: { ids: idsParam } }
        );
        const iconList = iconRes.data;

        if (iconList && Array.isArray(iconList.icons)) {
          iconMap = new Map(
            iconList.icons.map((icon) => [icon.contestId, icon.iconUrl])
          );
        }
      } catch (e) {
        console.error('Failed to fetch contest icons:', e);
      }
    }

    // ④ アイコン URL を contests にマージ
    // ここで返却されるオブジェクトは ContestWithIcon 型として扱われます
    const merged: ContestWithIcon[] = contests.map((c) => ({
      ...c,
      iconUrl: iconMap.get(c.contestId) ?? null,
    }));

    return merged;

  } catch (error) {
    console.error("Failed to fetch contests:", error);
    return [];
  }
}

// ----------------------
// Page Component
// ----------------------
export default async function ContestListPage() {
  const contests = await getContestsWithIcons();

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* ナビゲーションバー (固定) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
           <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
             WalkFind
           </Link>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mb-2">
               Current Finds
            </h1>
            <p className="text-gray-500">
               現在開催中のfindに参加して、街の景色を共有しましょう。
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white border border-dashed border-gray-300 rounded-xl">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-500 font-bold">No active finds available.</p>
              <p className="text-sm text-gray-400">現在表示できるコンテストはありません。</p>
            </div>
          ) : (
            contests.map((contest) => (
              <Link 
                key={contest.contestId} 
                href={`/contests/${contest.contestId}`} 
                className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-black/10 transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* 画像エリア */}
                <div className="h-48 bg-gray-100 relative flex items-center justify-center overflow-hidden font-sans">
                   
                   {/* ★修正3: 型定義 ContestWithIcon が適用されているためエラーが消えます */}
                   {contest.iconUrl ? (
                     <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={contest.iconUrl} 
                          alt={contest.name} 
                          className="w-full h-full object-cover"
                        />
                     </div>
                   ) : (
                     <span className="text-6xl transition-transform duration-500 group-hover:scale-110 select-none">
                        📷
                     </span>
                   )}
                   
                   {/* ステータスバッジ */}
                   {contest.status === 'IN_PROGRESS' && (
                     <div className="absolute top-3 left-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-white/20">
                        NOW OPEN
                     </div>
                   )}
                </div>

                {/* 情報エリア */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex-grow">
                      <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-black transition-colors line-clamp-2">
                        {contest.name}
                      </h2>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        <span className="font-bold text-gray-400 mr-1 text-xs uppercase tracking-wider">Theme:</span>
                        {contest.theme}
                      </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Ends: {new Date(contest.endDate).toLocaleDateString()}</span>
                    <span className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                        &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}