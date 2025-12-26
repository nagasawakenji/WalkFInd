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

type SimilaritySummary = {
  avgTop3: number;
  maxSimilarity: number;
  matchScore: number; // 0-100
};

type SimilarModelPhotoInsightResponse = {
  status: SimilarModelPhotoStatus;
  comment?: string | null;
  summary?: SimilaritySummary | null;
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