'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-10">
        <h1 className="text-3xl font-bold text-center mb-4">WalkFind</h1>
        <p className="text-center text-gray-600 mb-10">
          フォトコンテストに参加・投票・結果閲覧ができるサービスです
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 開催中コンテストへ */}
          <Link
            href="/contests"
            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition"
          >
            <span className="text-4xl mb-3">📸</span>
            <h2 className="text-xl font-bold text-blue-700 mb-2">
              開催中のコンテスト
            </h2>
            <p className="text-sm text-blue-600 text-center">
              現在参加できるフォトコンテスト一覧を見る
            </p>
          </Link>

          {/* 結果発表済みコンテストへ */}
          <Link
            href="/contests/announced"
            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition"
          >
            <span className="text-4xl mb-3">🏆</span>
            <h2 className="text-xl font-bold text-green-700 mb-2">
              結果発表済み
            </h2>
            <p className="text-sm text-green-600 text-center">
              過去に開催されたコンテストの結果を見る
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
