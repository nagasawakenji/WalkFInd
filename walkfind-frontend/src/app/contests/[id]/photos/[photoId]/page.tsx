'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import axios from 'axios';

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

// env
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
  // dim=2: (x,y) そのまま
  if (dim <= 2) return { x: p.x, y: p.y };
  // dim=3: 簡易的な斜投影（見える化目的）
  const z = p.z ?? 0;
  return {
    x: p.x - 0.6 * z,
    y: p.y - 0.4 * z,
  };
}

function buildPlotPoints(pr: ProjectionResponse): PlotPoint[] {
  const dim = pr.dim ?? 2;
  const all: Array<{ p: ProjectionPoint; isUser: boolean; label: string; key: string }> = [];

  all.push({
    p: pr.userPoint,
    isUser: true,
    label: `You (#${pr.userPoint.photoId})`,
    key: `USER-${pr.userPoint.photoId}`,
  });

  for (const mp of pr.modelPoints ?? []) {
    all.push({
      p: mp,
      isUser: false,
      label: mp.title ? `Model: ${mp.title}` : `Model (#${mp.photoId})`,
      key: `MODEL-${mp.photoId}`,
    });
  }

  // 投影
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

  // bounds
  const xs = projected.map((d) => d.px);
  const ys = projected.map((d) => d.py);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 0レンジ回避（全部同一点でも描けるように）
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);

  // 少し余白
  const pad = 0.12;
  const padX = spanX * pad;
  const padY = spanY * pad;

  const loX = minX - padX;
  const hiX = maxX + padX;
  const loY = minY - padY;
  const hiY = maxY + padY;

  const width = 420;
  const height = 420;
  const margin = 34;

  const innerW = width - margin * 2;
  const innerH = height - margin * 2;

  return projected.map((d) => {
    const nx = (d.px - loX) / (hiX - loX);
    const ny = (d.py - loY) / (hiY - loY);
    // SVGのY軸は下方向が+なので反転
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

function ProjectionPlot({ projection }: { projection: ProjectionResponse }) {
  const points = useMemo(() => buildPlotPoints(projection), [projection]);

  // 近すぎる/同一点のときのメッセージ
  const allSame = useMemo(() => {
    if (points.length <= 1) return true;
    const x0 = points[0].sx;
    const y0 = points[0].sy;
    return points.every((p) => Math.abs(p.sx - x0) < 0.5 && Math.abs(p.sy - y0) < 0.5);
  }, [points]);

  const width = 420;
  const height = 420;
  const margin = 34;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black">座標プロット</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">
            dim={projection.dim} / method={projection.method} / modelVersion={projection.modelVersion}
          </div>
        </div>
        {allSame && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-sm">
            点が重なっています（データが少ない場合は正常です）
          </div>
        )}
      </div>

      <div className="mt-3 border border-gray-200 rounded-sm bg-white p-3">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* frame */}
          <rect x={0} y={0} width={width} height={height} fill="white" />
          <rect x={margin} y={margin} width={width - margin * 2} height={height - margin * 2} fill="#FAFAFA" stroke="#E5E7EB" />

          {/* grid (simple) */}
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line
                x1={margin + (width - margin * 2) * t}
                y1={margin}
                x2={margin + (width - margin * 2) * t}
                y2={height - margin}
                stroke="#E5E7EB"
              />
              <line
                x1={margin}
                y1={margin + (height - margin * 2) * t}
                x2={width - margin}
                y2={margin + (height - margin * 2) * t}
                stroke="#E5E7EB"
              />
            </g>
          ))}

          {/* points */}
          {points.map((p) => (
            <g key={p.key}>
              <circle
                cx={p.sx}
                cy={p.sy}
                r={p.isUser ? 6 : 5}
                fill={p.isUser ? '#EF4444' : '#2563EB'}
                stroke="#111827"
                strokeWidth={0.5}
              >
                <title>
                  {p.label}  (x={p.raw.x.toFixed(3)}, y={p.raw.y.toFixed(3)}{projection.dim >= 3 ? `, z=${(p.raw.z ?? 0).toFixed(3)}` : ''})
                </title>
              </circle>
              {/* label */}
              <text
                x={p.sx + 8}
                y={p.sy - 8}
                fontSize={11}
                fill="#111827"
              >
                {p.isUser ? 'You' : 'Model'}
              </text>
            </g>
          ))}

          {/* axis labels */}
          <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#6B7280">
            projected-x
          </text>
          <text
            x={10}
            y={height / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#6B7280"
            transform={`rotate(-90 10 ${height / 2})`}
          >
            projected-y
          </text>
        </svg>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#EF4444' }} />
            <span>Your photo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#2563EB' }} />
            <span>Model photos</span>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-gray-500">
          ※ dim=3 の場合は簡易的な2D投影で表示しています（見える化目的）。
        </div>
      </div>
    </div>
  );
}

export default function PhotoSimilarityPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;
  const userPhotoId = resolvedParams.photoId;

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

      // ポーリング継続が不要なら止める（SUCCESS / FORBIDDEN / NOT_FOUND 等）
      if (!shouldPoll(r.data.status)) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        redirectToLogin();
        return;
      }
      const msg =
        extractApiErrorMessage(err) ??
        (axios.isAxiosError(err)
          ? `API error: status=${err.response?.status ?? 'unknown'}`
          : 'Unknown error');
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

      const st = res?.status; // res は1回遅れる可能性あるので、次回 fetchOnce 内でも止めてる
      if (shouldPoll(st)) {
        timerRef.current = window.setTimeout(loop, pollingMs);
      }
    };

    // 初回
    fetchOnce().then(() => {
      if (cancelled) return;
      // 初回結果がポーリング対象なら loop 開始
      const st = res?.status;
      if (shouldPoll(st)) {
        timerRef.current = window.setTimeout(loop, pollingMs);
      }
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

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href={`/contests/${contestId}`} className="text-sm text-gray-300 hover:text-white">
          Contest Details
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href={`/contests/${contestId}/photos`} className="text-sm text-gray-300 hover:text-white">
          Photos
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white">Similarity</span>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white border border-gray-300 rounded-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-black">類似度インサイト</h1>
              <p className="text-xs text-gray-500 font-mono mt-1">
                contestId={contestId} / userPhotoId={userPhotoId}
              </p>
            </div>

            <Link
              href={`/contests/${contestId}/photos`}
              className="text-sm px-3 py-2 border border-gray-300 rounded-sm bg-white hover:bg-gray-50"
            >
              ← 戻る
            </Link>
          </div>

          {fatalError && (
            <div className="mt-6 p-4 border border-red-300 bg-red-50 text-red-700 text-sm rounded-sm">
              {fatalError}
            </div>
          )}

          {!fatalError && (
            <>
              <div className="mt-6 flex items-center gap-2">
                <span className="text-xs text-gray-500">status</span>
                <span className="text-xs font-mono px-2 py-1 border border-gray-300 rounded-sm bg-gray-50">
                  {status ?? 'UNKNOWN'}
                </span>
                {isLoading && <span className="text-xs text-gray-400">loading...</span>}
              </div>

              {res?.comment && (
                <div className="mt-4 p-4 border border-gray-200 bg-gray-50 rounded-sm text-sm">
                  {res.comment}
                </div>
              )}

              {status === 'SUCCESS' && summary && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-sm bg-white">
                    <div className="text-xs text-gray-500">matchScore</div>
                    <div className="text-2xl font-bold">{summary.matchScore}</div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-sm bg-white">
                    <div className="text-xs text-gray-500">maxSimilarity</div>
                    <div className="text-xl font-mono">{summary.maxSimilarity.toFixed(4)}</div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-sm bg-white">
                    <div className="text-xs text-gray-500">avgTop3</div>
                    <div className="text-xl font-mono">{summary.avgTop3.toFixed(4)}</div>
                  </div>
                </div>
              )}

              {status === 'SUCCESS' && projection && (
                <ProjectionPlot projection={projection} />
              )}

              {shouldPoll(status) && (
                <div className="mt-6 text-sm text-gray-600">
                  類似度を計算中です。しばらくすると自動で更新されます（{pollingMs / 1000}s間隔）。
                </div>
              )}

              {status && !shouldPoll(status) && status !== 'SUCCESS' && (
                <div className="mt-6 text-sm text-gray-700">
                  現在の状態では表示できません（status={status}）。
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}