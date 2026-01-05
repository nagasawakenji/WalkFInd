import Link from 'next/link';
import { ContestDetailResponse } from '@/types'; // 型は適宜調整してください

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// 一覧取得用（開催中・予定・終了すべて含むか、API仕様に合わせて調整）
async function getContests(): Promise<ContestDetailResponse[]> {
  try {
    // クエリパラメータ等はバックエンドの仕様に合わせてください (?status=IN_PROGRESS など)
    const res = await fetch(`${API_BASE_URL}/contests`, { cache: "no-store" });
    if (!res.ok) return [];
    
    const data = await res.json();
    // レスポンスが { contests: [...] } の形式か、配列直かによって調整
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.contests)) return data.contests;
    return [];
  } catch {
    return [];
  }
}

export default async function ContestListPage() {
  const contests = await getContests();

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <nav className="bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:px-8">
        <Link href="/" className="font-bold text-xl tracking-tighter text-black hover:text-gray-600 transition-colors">
          WalkFind
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">現在のfind</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl">
              現在表示できるfindはありません。
            </div>
          ) : (
            contests.map((contest) => (
              <Link 
                key={contest.contestId} 
                href={`/contests/${contest.contestId}`} // ★ここをクリックすると UnifiedClient のページへ飛ぶ
                className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-400 transition-all duration-300 group"
              >
                <div className="h-40 bg-gray-100 relative flex items-center justify-center">
                   <span className="text-4xl group-hover:scale-110 transition-transform">📷</span>
                   
                   {contest.status === 'IN_PROGRESS' && (
                     <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        NOW OPEN
                     </div>
                   )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold mb-1 group-hover:text-blue-600 transition-colors">
                    {contest.name}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                    {contest.theme}
                  </p>
                  <div className="text-xs text-gray-400 font-mono">
                    End: {new Date(contest.endDate).toLocaleDateString()}
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