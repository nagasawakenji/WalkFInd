// src/app/contests/[id]/page.tsx
import { notFound } from 'next/navigation';
import { ContestDetailResponse } from '@/types';
// 同じフォルダにある想定
import ContestUnifiedClient from './ContestUnifiedClient'; 

interface PageProps {
  params: Promise<{ id: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function getContestDetail(id: string): Promise<ContestDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/contests/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ContestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contest = await getContestDetail(id);

  if (!contest) return notFound();

  return <ContestUnifiedClient contest={contest} contestId={id} />;
}