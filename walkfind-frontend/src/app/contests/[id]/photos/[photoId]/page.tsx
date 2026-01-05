'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------
// 型定義
// ---------------------------------------------------------
type SimilarModelPhotoStatus =
  | 'SUCCESS'
  | 'EMBEDDING_NOT_READY'
  | 'NO_MODEL_EMBEDDINGS'
  | 'INVALID_REQUEST'
  | 'FORBIDDEN'
  | 'CONTEST_NOT_FOUND'
  | 'USER_PHOTO_NOT_FOUND'
  | string;

type ProjectionPoint = {
  photoId: number;
  photoType: 'USER' | 'MODEL' | string;
  x: number;
  y: number;
  z?: number | null;
  imageUrl?: string | null;
  title?: string | null;
};

type ProjectionResponse = {
  dim: number;
  method: string;
  modelVersion: string;
  contestId: number;
  userPoint: ProjectionPoint;
  modelPoints: ProjectionPoint[];
};

type SimilaritySummary = {
  avgTop3: number;
  maxSimilarity: number;
  matchScore: number; // 0-100
};

type SimilarModelPhotoInsightResponse = {
  status: SimilarModelPhotoStatus;
  comment?: string | null;
  summary?: SimilaritySummary | null;
  projectionResponse?: ProjectionResponse | null;
};

type ApiErrorResponse = { message?: string };

interface PageProps {
  params: Promise<{ id: string; photoId: string }>;
}

// ---------------------------------------------------------
// 設定・ユーティリティ
// ---------------------------------------------------------
const IS_LOCAL = process.env.NODE_ENV !== 'production';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_LOCAL
    ? 'http://localhost:8080/api/v1'
    : 'https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1');

const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function extractApiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data as unknown;
  if (!data || typeof data !== 'object') return null;
  if ('message' in data && typeof (data as ApiErrorResponse).message === 'string') {
    return (data as ApiErrorResponse).message ?? null;
  }
  return null;
}

// ---------------------------------------------------------
// グラフ描画ロジック
// ---------------------------------------------------------
type PlotPoint = {
  key: string;
  label: string;
  isUser: boolean;
  sx: number;
  sy: number;
  raw: { x: number; y: number; z?: number | null };
  title?: string | null;
  imageUrl?: string | null;
};

function projectTo2D(p: { x: number; y: number; z?: number | null }, dim: number): { x: number; y: number } {
  if (dim <= 2) return { x: p.x, y: p.y };
  // dim=3: 簡易的な斜投影
  const z = p.z ?? 0;
  return {
    x: p.x - 0.6 * z,
    y: p.y - 0.4 * z,
  };
}

function buildPlotPoints(pr: ProjectionResponse): PlotPoint[] {
  const dim = pr.dim ?? 2;
  const all: Array<{ p: ProjectionPoint; isUser: boolean; label: string; key: string }> = [];

  // Model Points
  for (const mp of pr.modelPoints ?? []) {
    all.push({
      p: mp,
      isUser: false,
      label: mp.title ? `Model: ${mp.title}` : `Model (#${mp.photoId})`,
      key: `MODEL-${mp.photoId}`,
    });
  }

  // User Point (最後に描画して手前に来るようにする)
  all.push({
    p: pr.userPoint,
    isUser: true,
    label: `You (#${pr.userPoint.photoId})`,
    key: `USER-${pr.userPoint.photoId}`,
  });

  // 投影計算
  const projected = all.map(({ p, isUser, label, key }) => {
    const q = projectTo2D({ x: p.x, y: p.y, z: p.z }, dim);
    return {
      key,
      label,
      isUser,
      raw: { x: p.x, y: p.y, z: p.z },
      px: q.x,
      py: q.y,
      title: p.title,
      imageUrl: p.imageUrl,
    };
  });

  // 座標正規化 (SVG内におさめる)
  const xs = projected.map((d) => d.px);
  const ys = projected.map((d) => d.py);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);

  const pad = 0.15; // 余白を少し広めに
  const padX = spanX * pad;
  const padY = spanY * pad;

  const loX = minX - padX;
  const hiX = maxX + padX;
  const loY = minY - padY;
  const hiY = maxY + padY;

  const width = 500; // 解像度アップ
  const height = 400;
  const margin = 40;

  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  return projected.map((d) => {
    const nx = (d.px - loX) / (hiX - loX);
    const ny = (d.py - loY) / (hiY - loY);
    // SVG座標系変換 (Y軸反転)
    const sx = margin + nx * innerW;
    const sy = margin + (1 - ny) * innerH;
    return {
      key: d.key,
      label: d.label,
      isUser: d.isUser,
      sx,
      sy,
      raw: d.raw,
      title: d.title,
      imageUrl: d.imageUrl,
    };
  });
}

// ---------------------------------------------------------
// Component: ProjectionPlot (UI改善版)
// ---------------------------------------------------------
function ProjectionPlot({ projection }: { projection: ProjectionResponse }) {
  const points = useMemo(() => buildPlotPoints(projection), [projection]);

  const allSame = useMemo(() => {
    if (points.length <= 1) return true;
    const x0 = points[0].sx;
    const y0 = points[0].sy;
    return points.every((p) => Math.abs(p.sx - x0) < 0.5 && Math.abs(p.sy - y0) < 0.5);
  }, [points]);

  const width = 500;
  const height = 400;
  const margin = 40;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
      {/* グラフヘッダー */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🧭</span> Similarity Map
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            AIが分析した特徴空間上の位置関係 (PCA/t-SNE Projection)
          </p>
        </div>
        
        {/* レジェンド */}
        <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-gray-700">You</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 opacity-80"></span>
                <span className="text-gray-700">Model Photos</span>
            </div>
        </div>
      </div>

      {/* グラフエリア */}
      <div className="relative p-6 flex justify-center bg-white">
        {allSame && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
            ⚠️ データ点が重なっています（データ不足の可能性があります）
          </div>
        )}

        <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-auto max-w-[600px] select-none"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.05))' }}
        >
          {/* Grid Background */}
          <rect x={margin} y={margin} width={width - margin * 2} height={height - margin * 2} fill="#FAFAFA" rx="8" />
          
          {/* Axis Lines (Simple Grid) */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
             const pos = margin + (width - margin * 2) * t;
             return (
               <line key={`v-${t}`} x1={pos} y1={margin} x2={pos} y2={height - margin} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
             );
          })}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
             const pos = margin + (height - margin * 2) * t;
             return (
               <line key={`h-${t}`} x1={margin} y1={pos} x2={width - margin} y2={pos} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
             );
          })}

          {/* Points */}
          {points.map((p) => (
            <g key={p.key} className="group cursor-pointer">
              {/* Point Circle */}
              <circle
                cx={p.sx}
                cy={p.sy}
                r={p.isUser ? 8 : 5}
                fill={p.isUser ? '#EF4444' : '#3B82F6'}
                fillOpacity={p.isUser ? 1 : 0.6}
                stroke="white"
                strokeWidth={2}
                className={`transition-all duration-300 ease-out origin-center ${p.isUser ? 'hover:scale-125' : 'hover:scale-150 group-hover:fill-opacity-100'}`}
              />
              
              {/* User Pulse Effect */}
              {p.isUser && (
                 <circle cx={p.sx} cy={p.sy} r={12} stroke="#EF4444" strokeWidth="1" fill="none" opacity="0.5">
                    <animate attributeName="r" from="8" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                 </circle>
              )}

              {/* Tooltip (SVG Hover) */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect 
                    x={p.sx - 60} 
                    y={p.sy - 45} 
                    width="120" 
                    height="35" 
                    rx="6" 
                    fill="rgba(0,0,0,0.8)" 
                  />
                  <text
                    x={p.sx}
                    y={p.sy - 23}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="white"
                  >
                    {p.isUser ? 'You' : 'Model'}
                  </text>
                  <text
                    x={p.sx}
                    y={p.sy - 38} // 上に逃がす
                    textAnchor="middle"
                    fontSize="9"
                    fill="#D1D5DB"
                  >
                     (ID: {p.key.split('-')[1]})
                  </text>
              </g>
            </g>
          ))}
          
          {/* Labels */}
          <text x={width - margin} y={height - 10} textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="bold">Feature X</text>
          <text x={15} y={margin} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontWeight="bold" transform={`rotate(-90 15 ${margin})`}>Feature Y</text>
        </svg>
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-mono">
          <span>Method: {projection.method.toUpperCase()} (dim={projection.dim})</span>
          <span>Ver: {projection.modelVersion}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Page Component
// ---------------------------------------------------------
export default function PhotoSimilarityPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;
  const userPhotoId = resolvedParams.photoId;
  const router = useRouter();

  const [res, setRes] = useState<SimilarModelPhotoInsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const pollingMs = 2000;
  const timerRef = useRef<number | null>(null);

  const redirectToLogin = () => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    window.localStorage.setItem('redirect_after_login', currentPath);

    if (COGNITO_LOGIN_URL) window.location.href = COGNITO_LOGIN_URL;
    else window.location.href = '/login';
  };

  const endpointPath = useMemo(
    () => `/contests/${contestId}/photos/${userPhotoId}/similarity-insight`,
    [contestId, userPhotoId]
  );

  const shouldPoll = (status?: SimilarModelPhotoStatus | null) => {
    if (!status) return false;
    return status === 'EMBEDDING_NOT_READY' || status === 'NO_MODEL_EMBEDDINGS';
  };

  const fetchOnce = async () => {
    setIsLoading(true);
    try {
      const r = await api.get<SimilarModelPhotoInsightResponse>(endpointPath);
      setRes(r.data);

      if (!shouldPoll(r.data.status)) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        redirectToLogin();
        return;
      }
      const msg = extractApiErrorMessage(err) ?? 'Unknown error';
      setFatalError(msg);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      await fetchOnce();
      if (cancelled) return;
      const st = res?.status;
      if (shouldPoll(st)) timerRef.current = window.setTimeout(loop, pollingMs);
    };

    fetchOnce().then(() => {
      if (cancelled) return;
      if (shouldPoll(res?.status)) timerRef.current = window.setTimeout(loop, pollingMs);
    });

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointPath]);

  const status = res?.status ?? null;
  const summary = res?.summary ?? null;
  const projection = res?.projectionResponse ?? null;

  // ローディング画面
  if (isLoading && !res) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-black"></div>
                <p className="text-gray-500 font-bold text-sm">Analyzing Photo...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* ナビゲーション (Fixed & H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Analysis</span>
            </div>
        </div>
      </nav>

      {/* コンテンツエリア (pt-24) */}
      <div className="pt-24 max-w-4xl mx-auto px-4">
        
        {/* ヘッダー & 戻るボタン */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block py-1 px-3 rounded-full bg-black text-white text-xs font-bold tracking-wider uppercase">
                        AI Analysis
                    </span>
                    {/* ステータスバッジ */}
                    {status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                           <span className="w-2 h-2 rounded-full bg-green-500"></span> Ready
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                           <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span> {status ?? 'Processing...'}
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-extrabold text-black tracking-tight">
                    Photo Similarity Insight
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                    あなたの写真とモデル写真の類似性をAIが分析しました。
                </p>
            </div>

            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:bg-black hover:text-white hover:border-black transition-all shadow-sm flex items-center gap-2"
            >
              <span>←</span> Back to Photos
            </button>
        </div>

        {fatalError && (
            <div className="p-6 bg-white border border-red-100 rounded-xl shadow-sm text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-red-600 font-bold mb-1">Analysis Error</h3>
                <p className="text-gray-500 text-sm">{fatalError}</p>
            </div>
        )}

        {!fatalError && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* コメントエリア */}
              {res?.comment && (
                <div className="bg-gradient-to-br from-blue-50 to-white p-6 border border-blue-100 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                    <h3 className="text-blue-900 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                        <span className="text-lg">💡</span> AI Comment
                    </h3>
                    <p className="text-gray-700 leading-relaxed font-medium">
                        {res.comment}
                    </p>
                </div>
              )}

              {/* スコアカード (3カラム) */}
              {status === 'SUCCESS' && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Match Score */}
                  <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Score</div>
                    <div className="text-4xl font-black text-black tracking-tight">
                        {summary.matchScore}
                        <span className="text-lg text-gray-300 ml-1 font-normal">/100</span>
                    </div>
                  </div>
                  
                  {/* Max Similarity */}
                  <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Max Similarity</div>
                    <div className="text-2xl font-bold text-gray-800 font-mono">
                        {(summary.maxSimilarity * 100).toFixed(1)}<span className="text-sm">%</span>
                    </div>
                  </div>
                  
                  {/* Avg Top 3 */}
                  <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Top 3 Avg</div>
                    <div className="text-2xl font-bold text-gray-800 font-mono">
                        {(summary.avgTop3 * 100).toFixed(1)}<span className="text-sm">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* グラフ表示 */}
              {status === 'SUCCESS' && projection && (
                <ProjectionPlot projection={projection} />
              )}

              {/* ポーリング中のメッセージ */}
              {shouldPoll(status) && (
                <div className="text-center py-12">
                   <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                   <p className="text-gray-600 font-medium">Analyzing similarity vectors...</p>
                   <p className="text-xs text-gray-400 mt-1">Please wait a moment.</p>
                </div>
              )}
            </div>
        )}
      </div>
    </main>
  );
}